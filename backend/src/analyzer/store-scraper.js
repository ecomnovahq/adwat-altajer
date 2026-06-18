// وحدة سحب المتجر ومنتجاته (best-effort) — تُستخدم في «مساعد التاجر»
const axios = require('axios');
const cheerio = require('cheerio');
const { axiosProxy } = require('../proxy'); // بروكسي اختياري لتجاوز حجب المتاجر

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const H = { 'User-Agent': UA, 'Accept-Language': 'ar,en;q=0.8' };

function normUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { return new URL(u).toString().replace(/\/$/, ''); } catch { return ''; }
}

// ─── حماية SSRF: منع جلب عناوين داخلية/محجوزة (يحمي خادم الإنتاج) ─────────────
const dns = require('dns').promises;
const net = require('net');
function _isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;            // link-local + ميتاداتا السحابة
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    return false;
  }
  const a = String(ip).toLowerCase();
  if (a === '::1' || a === '::') return true;
  if (a.startsWith('::ffff:')) return _isPrivateIp(a.replace('::ffff:', ''));
  if (a.startsWith('fc') || a.startsWith('fd') || a.startsWith('fe80')) return true;
  return false;
}
async function assertPublicUrl(rawUrl) {
  const u = normUrl(rawUrl);
  let parsed; try { parsed = new URL(u); } catch { throw new Error('رابط غير صالح'); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('بروتوكول غير مسموح');
  const host = parsed.hostname;
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(host)) throw new Error('مضيف داخلي غير مسموح');
  if (net.isIP(host)) { if (_isPrivateIp(host)) throw new Error('عنوان داخلي غير مسموح'); return u; }
  let addrs; try { addrs = await dns.lookup(host, { all: true }); } catch { throw new Error('تعذّر تحليل اسم النطاق'); }
  if (!addrs || !addrs.length) throw new Error('تعذّر تحليل اسم النطاق');
  for (const a of addrs) if (_isPrivateIp(a.address)) throw new Error('المضيف يشير لعنوان داخلي غير مسموح');
  return u;
}

function detectPlatform(html) {
  const s = (html || '').toLowerCase();
  if (/salla\.(sa|store|net)|cdn\.salla|s-cdn\.|salla-cdn|salla\.network/.test(s)) return 'سلة';
  if (/zid\.(sa|store)|media\.zid|assets\.zid|cdn\.zid/.test(s)) return 'زد';
  if (/shopify|cdn\.shopify/.test(s)) return 'Shopify';
  if (/woocommerce|wp-content/.test(s)) return 'WooCommerce';
  return 'غير محدد';
}

// استخراج روابط التواصل الاجتماعي من الصفحة
function extractSocials($, html) {
  const map = {
    instagram: /instagram\.com\/[A-Za-z0-9_.]+/i,
    twitter: /(?:twitter|x)\.com\/[A-Za-z0-9_]+/i,
    tiktok: /tiktok\.com\/@[A-Za-z0-9_.]+/i,
    snapchat: /snapchat\.com\/add\/[A-Za-z0-9_.-]+/i,
    whatsapp: /(?:wa\.me|api\.whatsapp\.com|whatsapp\.com)\/[^\s"'<>]+/i,
    facebook: /facebook\.com\/[A-Za-z0-9_.-]+/i,
    youtube: /youtube\.com\/[^\s"'<>]+|youtu\.be\/[^\s"'<>]+/i,
    telegram: /t\.me\/[A-Za-z0-9_]+/i,
  };
  const hrefs = [];
  $('a[href]').each((_, el) => hrefs.push($(el).attr('href') || ''));
  const hay = hrefs.join(' ') + ' ' + html;
  const out = {};
  for (const [k, re] of Object.entries(map)) {
    const m = hay.match(re);
    if (m) out[k] = (m[0].startsWith('http') ? m[0] : 'https://' + m[0]).replace(/["'<>].*$/, '');
  }
  return out;
}

// استخراج أقسام المتجر من قائمة التنقّل/الروابط
function extractMenuCategories($, storeName) {
  const skip = /الرئيسية|تواصل|اتصل|حسابي|الحساب|السلة|عربة|المفضلة|تسجيل|دخول|حساب جديد|من نحن|عن المتجر|الأسئلة|سياسة|الشروط|المدونة|القائمة|عرض الكل|^الكل$|المزيد|كل المنتجات|الأقسام|تصفّح|روابط|عروض|تخفيضات|home|cart|login|account|contact|about|blog|search|menu|بحث|طلباتي|الطلبات|واتساب|whatsapp|quick\s*link|links|view\s*all|offers/i;
  const found = new Map();
  const sn = (storeName || '').trim();
  // روابط الأقسام في سلة/زد وعموماً
  $('a[href*="/category" i], a[href*="categories" i], a[href*="/c/" i], a[href*="قسم" i], a[href*="تصنيف" i], nav a, header a, .menu a, [class*="menu" i] a, [class*="categ" i] a').each((_, el) => {
    const t = $(el).text().replace(/\s{2,}/g, ' ').trim();
    const href = $(el).attr('href') || '';
    if (!t || t.length < 2 || t.length > 30) return;
    if (skip.test(t)) return;
    if (/^\d+$/.test(t)) return;
    if (sn && (t === sn || sn.includes(t) || t.includes(sn))) return; // اسم المتجر
    if (!found.has(t)) found.set(t, href);
  });
  // أقسام بأسمائها وروابطها (للزحف والربط)
  const cats = [...found.entries()]
    .filter(([_, h]) => h && /category|categories|\/c\/|قسم|تصنيف|collection|brand/i.test(h))
    .map(([name, href]) => ({ name, href }))
    .slice(0, 25);
  return { names: [...found.keys()].slice(0, 30), cats };
}

// زحف ذكي: ادخل كل قسم واستخرج منتجاته (مع تصفّح الصفحات) — يربط كل منتج بقسمه
async function crawlCategoryProducts(base, cats, cap = 400) {
  const abs = u => { try { return new URL(u, base).toString().split('#')[0]; } catch { return null; } };
  const urlCategory = new Map(); // productUrl → categoryName
  const visited = new Set();
  const list = cats.map(c => ({ name: c.name, href: abs(c.href) })).filter(c => c.href);
  for (const cat of list.slice(0, 25)) {
    if (urlCategory.size >= cap) break;
    for (let page = 1; page <= 12; page++) {
      if (urlCategory.size >= cap) break;
      const pageUrl = page === 1 ? cat.href : cat.href + (cat.href.includes('?') ? '&' : '?') + 'page=' + page;
      if (visited.has(pageUrl)) break;
      visited.add(pageUrl);
      let html;
      try { html = String((await axios.get(pageUrl, { ...axiosProxy, timeout: 12000, headers: H })).data); }
      catch { break; }
      const $ = cheerio.load(html);
      let added = 0;
      $('a[href]').each((_, el) => {
        const h = $(el).attr('href') || '';
        const a = abs(h); if (a && isProductUrl(a) && !urlCategory.has(a)) { urlCategory.set(a, cat.name); added++; }
      });
      if (added === 0) break;
    }
  }
  return urlCategory; // Map
}

// سحب معلومات المتجر الأساسية من الصفحة الرئيسية (مع إعادة محاولة)
async function fetchStoreInfo(url, _attempt = 0) {
  if (_attempt === 0) await assertPublicUrl(url); // حماية SSRF
  let resp;
  try {
    resp = await axios.get(url, { ...axiosProxy, timeout: 20000, maxRedirects: 6, headers: H });
  } catch (e) {
    if (_attempt < 2) { await new Promise(r => setTimeout(r, 1500 * (_attempt + 1))); return fetchStoreInfo(url, _attempt + 1); }
    throw e;
  }
  const html = resp.data;
  const $ = cheerio.load(html);
  const name = ($('meta[property="og:site_name"]').attr('content')
    || $('meta[property="og:title"]').attr('content')
    || $('title').text() || '').replace(/\s{2,}/g, ' ').trim().slice(0, 120);
  return {
    html,
    storeName: name || 'متجرك',
    platform: detectPlatform(html + ' ' + resp.request?.res?.responseUrl),
    description: ($('meta[name="description"]').attr('content') || '').trim().slice(0, 300),
    socials: extractSocials($, html),
    menuCategories: extractMenuCategories($, name),
    lang: $('html').attr('lang') || '',
  };
}

// النمط الكلاسيكي للمنتجات (سلة قديمة/زد/Shopify): /p123، /products/، /product/، /dp/
const PROD_RE = /\/p\d+|\/products?\/|\/product\/|\/dp\//i;
// روابط أقسام/صفحات لا تُعتبر منتجات
const CAT_RE = /\/category\/|\/categories\/|\/c\d+|\/c\//i;
// كلمات صفحات معروفة (لا منتجات)
const PAGE_WORDS = /^(about|about-us|contact|contact-us|faq|faqs|blog|terms|privacy|policy|policies|shipping|returns?|refund|account|login|register|cart|checkout|wishlist|search|sitemap|home|brands?|stores?|offers?|most-sales-products|طلباتي|الطلبات)$/i;
// هل الرابط منتج؟ — يدعم سلة الجديدة (slug بالجذر مثل /AzRKzln) + الأنماط الكلاسيكية
function isProductUrl(u) {
  if (CAT_RE.test(u)) return false;
  if (/\/p\/[^/]+$/i.test(u)) return false;        // صفحات سلة التعريفية /p/slug
  if (PROD_RE.test(u)) return true;                 // الأنماط الكلاسيكية
  try {
    const seg = new URL(u).pathname.replace(/^\/+|\/+$/g, '');
    if (!seg || seg.includes('/')) return false;    // مقطع واحد فقط بالجذر
    if (PAGE_WORDS.test(seg)) return false;
    // slug شبيه بالمعرّف: حروف/أرقام/شرطة، طول 4-20، وفيه حرف كبير أو رقم (ليس كلمة عادية)
    return /^[A-Za-z0-9_-]{4,20}$/.test(seg) && /[A-Z0-9]/.test(seg);
  } catch { return false; }
}
const HARD_CAP = 1000; // الحد الأقصى المطلق (أعلى باقة)

// جلب كل روابط المتجر من sitemap وتصنيفها (منتجات / صفحات)
async function urlsFromSitemap(base) {
  const seeds = [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`, `${base}/sitemap-products.xml`, `${base}/sitemap_products_1.xml`];
  const productUrls = new Set();
  const pageUrls = new Set();
  const visited = new Set();

  async function readMap(sm, depth) {
    if (visited.has(sm) || depth > 3 || productUrls.size >= HARD_CAP) return;
    visited.add(sm);
    let data;
    try { data = String((await axios.get(sm, { ...axiosProxy, timeout: 9000, headers: H })).data); } catch { return; }
    const locs = (data.match(/<loc>([^<]+)<\/loc>/gi) || []).map(l => l.replace(/<\/?loc>/gi, '').trim());
    const subMaps = locs.filter(u => /\.xml($|\?)/i.test(u));
    const pages = locs.filter(u => !/\.xml($|\?)/i.test(u));
    pages.forEach(u => { if (isProductUrl(u)) productUrls.add(u); else pageUrls.add(u); });
    // ادخل الخرائط الفرعية (المنتجات أولاً)
    const ordered = subMaps.sort((a, b) => (/(product)/i.test(b) ? 1 : 0) - (/(product)/i.test(a) ? 1 : 0));
    for (const sub of ordered) { if (productUrls.size >= HARD_CAP) break; await readMap(sub, depth + 1); }
  }

  for (const s of seeds) { if (productUrls.size >= HARD_CAP) break; await readMap(s, 0); }
  return { productUrls: [...productUrls].slice(0, HARD_CAP), pageUrls: [...pageUrls].slice(0, 60) };
}

// ─── مصادر بيانات رسمية للمنصات: تعطي كل المنتجات كاملة بدون اعتماد على رندر/حجب ──
async function fetchPlatformProducts(base) {
  const out = [];
  const clean = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  // 1) Shopify — /products.json (متاح للعامة في أغلب متاجر Shopify)
  try {
    let page = 1;
    while (page <= 5 && out.length < HARD_CAP) {
      const r = await axios.get(`${base}/products.json?limit=250&page=${page}`, { ...axiosProxy, timeout: 12000, headers: { ...H, Accept: 'application/json' } });
      const prods = r.data && Array.isArray(r.data.products) ? r.data.products : [];
      if (!prods.length) break;
      for (const p of prods) {
        const imgs = (p.images || []).map(i => i.src).filter(Boolean);
        const price = (p.variants && p.variants[0] && p.variants[0].price) ? String(p.variants[0].price) : null;
        const desc = clean(p.body_html).slice(0, 1200);
        out.push({
          url: `${base}/products/${p.handle}`, name: (p.title || '').slice(0, 160),
          price, currency: 'SAR', image: imgs[0] || null, images: imgs.slice(0, 10),
          description: desc, category: (p.product_type || '').slice(0, 80),
          hasDescription: desc.length >= 20,
        });
      }
      if (prods.length < 250) break;
      page++;
    }
    if (out.length) return out;
  } catch { /* ليست Shopify أو محجوبة */ }
  // 2) WooCommerce — Store API العامة
  try {
    for (let pg = 1; pg <= 5 && out.length < HARD_CAP; pg++) {
      const r = await axios.get(`${base}/wp-json/wc/store/v1/products?per_page=100&page=${pg}`, { ...axiosProxy, timeout: 12000, headers: { ...H, Accept: 'application/json' } });
      const prods = Array.isArray(r.data) ? r.data : [];
      if (!prods.length) break;
      for (const p of prods) {
        const imgs = (p.images || []).map(i => i.src).filter(Boolean);
        const minor = (p.prices && p.prices.currency_minor_unit) || 0;
        const raw = p.prices && p.prices.price;
        const price = raw != null ? String(Number(raw) / Math.pow(10, minor)) : null;
        const desc = clean(p.short_description || p.description).slice(0, 1200);
        out.push({
          url: p.permalink, name: clean(p.name).slice(0, 160), price,
          currency: (p.prices && p.prices.currency_code) || 'SAR',
          image: imgs[0] || null, images: imgs.slice(0, 10), description: desc,
          category: (p.categories && p.categories[0] && p.categories[0].name) || '', hasDescription: desc.length >= 20,
        });
      }
      if (prods.length < 100) break;
    }
  } catch { /* ليست WooCommerce */ }
  return out;
}

// سحب بيانات منتج واحد من صفحته
async function fetchProduct(url) {
  try {
    await assertPublicUrl(url); // حماية SSRF
    const r = await axios.get(url, { ...axiosProxy, timeout: 12000, maxRedirects: 4, headers: H });
    const $ = cheerio.load(r.data);
    // JSON-LD أولاً (الأدق)
    let ld = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      if (ld) return;
      try {
        const j = JSON.parse($(el).contents().text());
        const arr = Array.isArray(j) ? j : (j['@graph'] || [j]);
        const prod = arr.find(x => x && /product/i.test(x['@type'] || ''));
        if (prod) ld = prod;
      } catch { /* skip */ }
    });
    const name = (ld?.name || $('meta[property="og:title"]').attr('content') || $('h1').first().text() || '').trim().slice(0, 160);
    if (!name) return null;
    const offers = ld?.offers ? (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers) : null;
    const price = offers?.price || offers?.lowPrice || null;
    const currency = offers?.priceCurrency || 'SAR';
    // معرض الصور: JSON-LD (قد يكون مصفوفة/كائن) + og:image + صور معرض المنتج في الصفحة
    const toAbs = s => { try { return new URL(String(s).trim(), url).toString(); } catch { return ''; } };
    const ldImgRaw = ld?.image ? (Array.isArray(ld.image) ? ld.image : [ld.image]) : [];
    const ldImgs = ldImgRaw.map(x => (x && typeof x === 'object') ? (x.url || x['@id'] || '') : x).filter(Boolean);
    const galleryImgs = [];
    $('img[class*="product" i], [class*="gallery" i] img, [class*="slider" i] img, [class*="thumb" i] img, [class*="media" i] img, [itemprop="image"]').each((_, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-original') || '';
      if ((!src || /^data:/.test(src)) && $(el).attr('srcset')) src = ($(el).attr('srcset').split(',')[0] || '').trim().split(' ')[0];
      if (src && !/^data:/.test(src)) galleryImgs.push(src);
    });
    const ogImg = $('meta[property="og:image"]').attr('content') || $('meta[property="og:image:secure_url"]').attr('content');
    const allImgs = [...new Set([...ldImgs, ...(ogImg ? [ogImg] : []), ...galleryImgs].map(toAbs).filter(s => /^https?:\/\//.test(s) && !/(logo|placeholder|blank|sprite|icon)\b/i.test(s)))].slice(0, 10);
    const image = allImgs[0] || null;
    // الوصف: JSON-LD → og → meta → حاوية الوصف في صفحة المنتج (الأدق)
    let desc = ld?.description || $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    if (!desc || desc.trim().length < 40) {
      const bodyDesc = $('[itemprop="description"], [class*="product" i][class*="description" i], [class*="description" i], #description, [class*="product-detail" i], [class*="product-content" i], [class*="short-description" i]')
        .first().text().replace(/\s+/g, ' ').trim();
      if (bodyDesc && bodyDesc.length > (desc || '').trim().length) desc = bodyDesc;
    }
    desc = String(desc).replace(/\s+/g, ' ').trim().slice(0, 1200);
    // تصنيف المنتج: من JSON-LD أو فتات الخبز (breadcrumb)
    let category = '';
    if (ld?.category) category = String(Array.isArray(ld.category) ? ld.category[0] : ld.category).trim();
    if (!category) {
      const crumbs = $('[class*="breadcrumb"] a, nav[aria-label*="bread" i] a').map((_, el) => $(el).text().trim()).get().filter(Boolean);
      if (crumbs.length >= 2) category = crumbs[crumbs.length - 2]; // قبل اسم المنتج
    }
    category = category.replace(/\s{2,}/g, ' ').slice(0, 80);
    return { url, name, price: price ? String(price) : null, currency, image, images: allImgs, description: desc, category, hasDescription: desc.replace(/<[^>]+>/g, '').trim().length >= 20 };
  } catch { return null; }
}

// اسم مقروء من رابط الصفحة (آخر مقطع، فكّ الترميز، استبدال الفواصل)
function slugToName(u) {
  try {
    const p = new URL(u).pathname.replace(/\/+$/, '');
    if (!p || p === '') return 'الصفحة الرئيسية';
    let seg = p.split('/').filter(Boolean).pop() || '';
    // تجاهل بادئة اللغة
    if (/^(ar|en)$/i.test(seg)) return 'الصفحة الرئيسية';
    seg = decodeURIComponent(seg).replace(/\.(html?|php|aspx?)$/i, '');
    seg = seg.replace(/[-_]+/g, ' ').replace(/\b(p|c)\d+\b/gi, '').replace(/\s{2,}/g, ' ').trim();
    // أسماء معروفة شائعة
    const known = { 'privacy policy': 'سياسة الخصوصية', terms: 'الشروط والأحكام', about: 'من نحن', 'about us': 'من نحن', contact: 'تواصل معنا', faq: 'الأسئلة الشائعة', blog: 'المدوّنة', shipping: 'الشحن والتوصيل', returns: 'الاستبدال والاسترجاع' };
    if (known[seg.toLowerCase()]) return known[seg.toLowerCase()];
    return seg.length >= 2 ? seg.slice(0, 60) : '';
  } catch { return ''; }
}

// تصنيف الصفحة (تعريفية/سياسات/أقسام/أخرى)
function pageKind(u) {
  let s = u.toLowerCase();
  try { s += ' ' + decodeURIComponent(u).toLowerCase(); } catch {}
  if (/about|من-نحن|من_نحن|story|عن-المتجر/.test(s)) return 'تعريفية';
  if (/privacy|terms|policy|سياسة|الخصوصية|الشروط|الاستبدال|الاسترجاع|return|refund|shipping|الشحن/.test(s)) return 'سياسات';
  if (/category|categories|\/c\/|قسم|تصنيف|brands?|الماركات/.test(s)) return 'أقسام';
  if (/contact|تواصل|اتصل|faq|الأسئلة/.test(s)) return 'تواصل';
  if (/blog|مدونة|article|news/.test(s)) return 'مدونة';
  return 'أخرى';
}

// السحب الكامل: معلومات المتجر + كل منتجاته + صفحاته
async function scrapeStoreFull(rawUrl, { limit = 100, onProgress } = {}) {
  const prog = (pct, label) => { try { onProgress && onProgress(pct, label); } catch (_) {} };
  const url = normUrl(rawUrl);
  if (!url) throw new Error('رابط غير صالح');
  await assertPublicUrl(url); // حماية SSRF — منع العناوين الداخلية
  const cap = Math.min(Math.max(parseInt(limit) || 100, 1), HARD_CAP); // حد الباقة
  const maxFetch = cap;
  const base = new URL(url).origin;
  prog(5, 'جارٍ الاتصال بالمتجر…');
  let info;
  try { info = await fetchStoreInfo(url); }
  catch (e) {
    // فشل جلب الرئيسية الساكن — لا نسقط؛ نكمل بالمتصفّح ببيانات مبدئية
    info = { storeName: 'متجرك', platform: 'غير محدد', description: '', socials: {}, menuCategories: { names: [], cats: [] } };
  }
  const menuCats = info.menuCategories || { names: [], cats: [] };
  let products = [];
  let productUrls = [], pageUrls = [];
  let urlCategory = new Map();
  const browserPageNames = {}; // url → اسم مقروء من المتصفّح
  try {
    // 1) روابط المنتجات من sitemap
    prog(15, 'قراءة خريطة الموقع واكتشاف المنتجات…');
    const maps = await urlsFromSitemap(base);
    productUrls = maps.productUrls; pageUrls = maps.pageUrls;
    // 1.5) مصادر المنصة الرسمية (Shopify/WooCommerce) — منتجات كاملة فوراً
    prog(20, 'محاولة مصادر المنصة الرسمية (Shopify/Woo)…');
    var directProducts = await fetchPlatformProducts(base).catch(() => []);
    var directUrls = new Set(directProducts.map(p => p.url));
    directProducts.forEach(p => products.push(p));
    if (directUrls.size) productUrls = [...new Set([...directUrls, ...productUrls])];
    // 2) زحف ذكي بالأقسام — يربط كل منتج بقسمه + يكمّل ما ينقص الـsitemap
    const cats = [...(menuCats.cats || [])];
    // أضف صفحات الأقسام من الـsitemap كأقسام (الاسم من الـslug)
    pageUrls.filter(u => pageKind(u) === 'أقسام').forEach(u => cats.push({ name: slugToName(u), href: u }));
    if (cats.length) {
      prog(28, `الزحف داخل ${cats.length} قسماً…`);
      try { urlCategory = await crawlCategoryProducts(base, cats, cap); } catch { /* best-effort */ }
      productUrls = [...new Set([...productUrls, ...urlCategory.keys()])];
    }
    // 2.5) زحف بمتصفّح حقيقي (Puppeteer) — يلتقط منتجات الجافاسكربت وأقسامها (الأدق للمتاجر الحديثة)
    prog(40, 'تشغيل متصفّح ذكي لالتقاط منتجات الجافاسكربت…');
    const browserMap = new Map(); // url → {name,price,image,category}
    try {
      const { crawlWithBrowser } = require('./browser-scraper');
      // أقسام بذرة من الـsitemap + القائمة لزيارتها بالمتصفّح (يلتقط منتجات كل قسم)
      const seedCats = [
        ...(menuCats.cats || []),
        ...pageUrls.filter(u => pageKind(u) === 'أقسام').map(u => ({ name: slugToName(u), href: u })),
      ];
      const br = await crawlWithBrowser(base, cap, seedCats);
      // ادمج HTML المعروض بعد JS (يحوي الفوتر: أيقونات الدفع + التوثيق) ليراه الفحص التقني
      if (br.homeHtml && br.homeHtml.length > 500) info.html = (info.html || '') + '\n<!--rendered-->\n' + br.homeHtml;
      (br.products || []).forEach(p => {
        browserMap.set(p.url, p);
        if (!urlCategory.has(p.url) && p.category) urlCategory.set(p.url, p.category);
      });
      const brUrls = (br.products || []).map(p => p.url);
      // أولوية لروابط المتصفّح (بياناتها موثوقة حتى لو حجب المتجر الطلبات المباشرة)
      productUrls = [...new Set([...brUrls, ...productUrls])];
      (br.categories || []).forEach(c => { if (c && !(menuCats.names || []).includes(c)) (menuCats.names = menuCats.names || []).push(c); });
      // التواصل والصفحات من المتصفّح (عند غيابها من الـsitemap/الصفحة الساكنة)
      if (br.socials && Object.keys(br.socials).length) info.socials = { ...(br.socials), ...(info.socials || {}) };
      if (br.pages && br.pages.length) {
        const have = new Set(pageUrls);
        br.pages.forEach(pg => { browserPageNames[pg.url] = pg.name; if (!have.has(pg.url)) { pageUrls.push(pg.url); have.add(pg.url); } });
      }
    } catch { /* best-effort */ }

    productUrls = productUrls.slice(0, cap);
    // 3) اسحب تفاصيل المنتجات بالتوازي (8 معاً) — JSON-LD، ثم بيانات المتصفّح كحل احتياطي
    //     (تخطَّ المنتجات المكتملة من مصدر المنصة الرسمي)
    const toFetch = productUrls.filter(u => !directUrls.has(u)).slice(0, maxFetch);
    for (let i = 0; i < toFetch.length; i += 8) {
      const batch = toFetch.slice(i, i + 8);
      prog(50 + Math.round(i / Math.max(toFetch.length, 1) * 40), `سحب تفاصيل المنتجات (${Math.min(i + 8, toFetch.length)}/${toFetch.length})…`);
      const got = await Promise.all(batch.map(async u => {
        let p = await fetchProduct(u);
        const bm = browserMap.get(u);
        if (!p && bm) p = { url: u, name: bm.name, price: bm.price, currency: 'SAR', image: bm.image, images: bm.image ? [bm.image] : [], description: '', category: '', hasDescription: false };
        if (p) {
          // القسم: من زحف الأقسام (الأدق) ثم بيانات المتصفّح
          if (!p.category) p.category = urlCategory.get(u) || (bm && bm.category) || '';
          if (!p.image && bm && bm.image) p.image = bm.image;
          if (!p.price && bm && bm.price) p.price = bm.price;
          // ادمج صورة المتصفّح في المعرض إن لم تكن موجودة
          p.images = [...new Set([...(p.images || []), ...(p.image ? [p.image] : []), ...(bm && bm.image ? [bm.image] : [])])].filter(Boolean);
          if (!p.image && p.images.length) p.image = p.images[0];
        }
        return p;
      }));
      got.filter(Boolean).forEach(p => products.push(p));
    }
  } catch { /* best-effort */ }
  prog(90, 'مراجعة البيانات: إزالة التكرار واسترجاع الصور/الأوصاف…');
  // مراجعة وتنظيف: دمج المكرّرات + استرجاع الصورة/الوصف من النسخة الأغنى
  const cleanProducts = dedupeProducts(products);
  // إثراء المنتجات الناقصة (بلا صورة ووصف) عبر المتصفّح — صفحات منتجات تُبنى بالـJS بلا JSON-LD
  try {
    const bare = cleanProducts.filter(p => !p.image && !(p.images && p.images.length) && !p.hasDescription).map(p => p.url).filter(Boolean);
    if (bare.length) {
      prog(93, `إثراء ${Math.min(bare.length, 15)} منتج ناقص عبر المتصفّح…`);
      const { enrichProductsWithBrowser } = require('./browser-scraper');
      const enriched = await enrichProductsWithBrowser(bare, 15);
      cleanProducts.forEach(p => {
        const en = enriched[p.url]; if (!en) return;
        if (!p.image && en.image) p.image = en.image;
        if (en.images && en.images.length) p.images = [...new Set([...(p.images || []), ...en.images])];
        if (!p.price && en.price) p.price = en.price;
        if (!p.category && en.category) p.category = en.category;
        if (!p.name && en.name) p.name = en.name;
        if (!p.hasDescription && en.hasDescription) { p.description = en.description; p.hasDescription = true; }
      });
    }
  } catch { /* best-effort */ }
  // الصفحات: اسم مقروء + رابط + نوع
  const pages = pageUrls.map(u => ({ url: u, name: browserPageNames[u] || slugToName(u), kind: pageKind(u) }));
  // الأقسام النهائية: من القائمة + من المنتجات المربوطة
  const allCats = [...new Set([...(menuCats.names || []), ...cleanProducts.map(p => p.category).filter(Boolean)])].slice(0, 40);
  return {
    url, base, ...info,
    menuCategories: allCats,
    products: cleanProducts,
    productUrlsCount: cleanProducts.length,
    productLimit: cap,
    pages,
    pageUrls,
    pagesCount: pageUrls.length,
  };
}

// ─── مراجعة وتنظيف المنتجات بعد التجميع: دمج المكرّر + استرجاع الصورة/الوصف من الأغنى ──
function normName(s) {
  return String(s || '')
    .replace(/[ً-ْـ]/g, '')            // تشكيل وكشيدة
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}
function urlKey(u) {
  try { const x = new URL(u); return (x.host.replace(/^www\./, '') + x.pathname).replace(/\/+$/, '').toLowerCase(); }
  catch { return String(u || '').split('#')[0].split('?')[0].replace(/\/+$/, '').toLowerCase(); }
}
function richness(p) {
  return (p.image ? 2 : 0) + ((p.images && p.images.length) ? 1 : 0)
    + (p.hasDescription ? 2 : 0) + (p.price ? 1 : 0) + (p.category ? 1 : 0);
}
function mergeProduct(a, b) {
  // ادمج b داخل a مع تفضيل القيم غير الفارغة والأغنى
  const out = { ...a };
  out.name = (b.name && b.name.length > (a.name || '').length) ? b.name : (a.name || b.name);
  out.image = a.image || b.image || null;
  out.images = [...new Set([...(a.images || []), ...(b.images || []), a.image, b.image].filter(Boolean))];
  if (!out.image && out.images.length) out.image = out.images[0];
  out.price = a.price || b.price || null;
  out.currency = a.currency || b.currency || 'SAR';
  out.category = a.category || b.category || '';
  const da = String(a.description || ''), db = String(b.description || '');
  out.description = db.replace(/<[^>]+>/g, '').length > da.replace(/<[^>]+>/g, '').length ? db : da;
  out.hasDescription = !!(a.hasDescription || b.hasDescription || out.description.replace(/<[^>]+>/g, '').trim().length >= 20);
  out.url = (richness(b) > richness(a)) ? (b.url || a.url) : (a.url || b.url);
  return out;
}
function dedupeProducts(products) {
  // 1) دمج حسب رابط مُطبَّع (يلتقط /p1 و/p1/ و/p1?x=)
  const byUrl = new Map();
  for (const p of products) {
    if (!p || !p.name) continue;
    const k = urlKey(p.url) || normName(p.name);
    byUrl.set(k, byUrl.has(k) ? mergeProduct(byUrl.get(k), p) : p);
  }
  // 2) دمج حسب الاسم المُطبَّع (يلتقط نفس المنتج برابطين مختلفين)
  const byName = new Map();
  for (const p of byUrl.values()) {
    const nk = normName(p.name);
    if (nk.length < 4) { byName.set('u:' + (urlKey(p.url) || Math.random()), p); continue; } // أسماء قصيرة: لا تدمج
    byName.set(nk, byName.has(nk) ? mergeProduct(byName.get(nk), p) : p);
  }
  return [...byName.values()];
}

module.exports = { scrapeStoreFull, fetchStoreInfo, fetchProduct, fetchPlatformProducts, isProductUrl, normUrl, detectPlatform, assertPublicUrl };
