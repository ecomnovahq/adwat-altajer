// زاحف بمتصفّح حقيقي (Puppeteer) — يُحمّل الجافاسكربت ويسحب المنتجات والأقسام كما يراها الزائر
// يحلّ مشكلة متاجر سلة/زد المعتمدة على JS التي لا يراها الزحف الساكن.
const puppeteer = require('puppeteer-core');
const logger = require('../logger');

const CHROME_PATH = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const delay = ms => new Promise(r => setTimeout(r, ms));
const PROD_RE = /\/p\d+|\/products?\/|\/product\/|\/dp\//i;
// منتج؟ — كلاسيكي أو slug بالجذر (سلة الجديدة)، مع استثناء /p/slug (صفحات) و/category
function isProdUrl(u) {
  if (/\/category\/|\/categories\/|\/c\d+|\/c\//i.test(u)) return false;
  if (/\/p\/[^/?#]+([?#]|$)/i.test(u)) return false;
  if (PROD_RE.test(u)) return true;
  try {
    const seg = new URL(u).pathname.replace(/^\/+|\/+$/g, '');
    if (!seg || seg.includes('/')) return false;
    if (/^(about|about-us|contact|contact-us|faq|faqs|blog|terms|privacy|policy|policies|shipping|returns?|refund|account|login|register|cart|checkout|wishlist|search|sitemap|home|brands?|stores?|offers?|most-sales-products)$/i.test(seg)) return false;
    return /^[A-Za-z0-9_-]{4,20}$/.test(seg) && /[A-Z0-9]/.test(seg);
  } catch { return false; }
}

async function autoScroll(page, maxMs = 6000) {
  const start = Date.now();
  let last = 0, stable = 0;
  while (Date.now() - start < maxMs) {
    const h = await page.evaluate(() => { window.scrollBy(0, document.body.scrollHeight); return document.body.scrollHeight; });
    await delay(700);
    if (h === last) { if (++stable >= 2) break; } else stable = 0;
    last = h;
  }
}

// استخرج بطاقات المنتجات من الصفحة المعروضة
function extractProductsInPage() {
  const isProd = (href) => {
    if (/\/category\/|\/categories\/|\/c\d+|\/c\//i.test(href)) return false;
    if (/\/p\/[^/?#]+([?#]|$)/i.test(href)) return false;
    if (/\/p\d+|\/products?\/|\/product\/|\/dp\//i.test(href)) return true;
    try {
      const seg = new URL(href).pathname.replace(/^\/+|\/+$/g, '');
      if (!seg || seg.includes('/')) return false;
      if (/^(about|about-us|contact|contact-us|faq|faqs|blog|terms|privacy|policy|policies|shipping|returns?|refund|account|login|register|cart|checkout|wishlist|search|sitemap|home|brands?|stores?|offers?|most-sales-products)$/i.test(seg)) return false;
      return /^[A-Za-z0-9_-]{4,20}$/.test(seg) && /[A-Z0-9]/.test(seg);
    } catch (e) { return false; }
  };
  const out = {};
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.href;
    if (!isProd(href)) return;
    const card = a.closest('[class*="product" i], li, .s-product-card, article, [class*="card" i]') || a;
    const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
    let name = text;
    const nameEl = card.querySelector('[class*="name" i], [class*="title" i], h2, h3');
    if (nameEl && nameEl.textContent.trim()) name = nameEl.textContent.replace(/\s+/g, ' ').trim();
    let price = '';
    const priceEl = card.querySelector('[class*="price" i], [class*="amount" i]');
    if (priceEl) { const m = priceEl.textContent.replace(/[^\d.,]/g, ' ').match(/[\d.]+/); if (m) price = m[0]; }
    let image = '';
    const img = card.querySelector('img');
    if (img) {
      image = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('data-srcset') || '';
      if ((!image || /placeholder|blank|loading|data:image\/svg|^data:/i.test(image)) && img.getAttribute('srcset')) {
        image = (img.getAttribute('srcset').split(',')[0] || '').trim().split(' ')[0];
      }
    }
    if (!image) {
      const bgEl = card.querySelector('[style*="background-image"]');
      if (bgEl && bgEl.style && bgEl.style.backgroundImage) { const m = bgEl.style.backgroundImage.match(/url\(["']?([^"')]+)/); if (m) image = m[1]; }
    }
    if (image) { if (image.startsWith('//')) image = location.protocol + image; else if (image.startsWith('/')) image = location.origin + image; }
    if (/^data:/i.test(image)) image = '';
    const key = href.split('#')[0].split('?')[0];
    if (!out[key] || (name && name.length > (out[key].name || '').length)) {
      out[key] = { url: key, name: (name || '').slice(0, 160), price: price || null, image: image || null };
    }
  });
  return Object.values(out);
}

// استخرج روابط الأقسام من الصفحة المعروضة (يدعم /c123 و/category/ وزد وعموماً)
function extractCategoryLinksInPage() {
  const skip = /الرئيسية|تواصل|حسابي|السلة|المفضلة|تسجيل|دخول|من نحن|الأسئلة|سياسة|الشروط|المدونة|عرض الكل|كل المنتجات|روابط|قائمة|عروض|تخفيضات|home|cart|login|account|contact|about|blog|quick\s*link|links|menu|view\s*all|offers/i;
  const CAT = /\/c\d+|\/category\/|\/categories\/|\/c\/|collection|\/brand|قسم|تصنيف/i;
  const map = {};
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.href;
    if (!CAT.test(href) || /\/p\d+|\/p\/[A-Za-z0-9]/.test(href)) return;
    let name = (a.textContent || '').replace(/\s+/g, ' ').trim();
    if (!name) { const img = a.querySelector('img'); if (img) name = (img.getAttribute('alt') || '').trim(); }
    if (!name || name.length < 2 || name.length > 30 || skip.test(name)) return;
    if (/^[\d\s+]+$/.test(name) || /banner|fixed|slider|سلايدر|بانر/i.test(name)) return;
    const key = href.split('#')[0];
    if (!map[key]) map[key] = { name, href: key };
  });
  return Object.values(map).slice(0, 20);
}

// استخرج روابط التواصل من الصفحة المعروضة
function extractSocialsInPage() {
  const map = { instagram:/instagram\.com\/[A-Za-z0-9_.]+/i, twitter:/(?:twitter|x)\.com\/[A-Za-z0-9_]+/i, tiktok:/tiktok\.com\/@[A-Za-z0-9_.]+/i, snapchat:/snapchat\.com\/add\/[A-Za-z0-9_.-]+/i, whatsapp:/(?:wa\.me|api\.whatsapp\.com)\/[0-9]+/i, facebook:/facebook\.com\/[A-Za-z0-9_.-]+/i, youtube:/youtube\.com\/[^\s"'<>]+/i, telegram:/t\.me\/[A-Za-z0-9_]+/i };
  const hrefs = [...document.querySelectorAll('a[href]')].map(a => a.href).join(' ');
  const out = {};
  for (const k in map) { const m = hrefs.match(map[k]); if (m) out[k] = m[0]; }
  return out;
}

// استخرج صفحات المتجر (سياسات/تعريفية/عروض...) من الصفحة المعروضة
function extractPagesInPage() {
  const origin = location.origin;
  const out = {};
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.href.split('#')[0];
    if (!href.startsWith(origin)) return;
    // استثنِ المنتجات الكلاسيكية والأقسام والروابط الوظيفية (لكن أبقِ /p/slug صفحات تعريفية)
    if (/\/p\d+|\/products?\/|\/product\/|\/dp\/|\/c\d+|\/category\/|\/categories\/|\/c\/|\/cart|\/login|\/account|\/wishlist|tel:|wa\.me|\.(svg|png|jpg)/i.test(href)) return;
    // استثنِ منتجات الجذر (slug شبيه بالمعرّف)
    try { const sg = new URL(href).pathname.replace(/^\/+|\/+$/g, ''); if (sg && !sg.includes('/') && /^[A-Za-z0-9_-]{4,20}$/.test(sg) && /[A-Z0-9]/.test(sg)) return; } catch (e) {}
    if (href === origin + '/' || href === origin) return;
    const name = (a.textContent || '').replace(/\s+/g, ' ').trim();
    if (!name || name.length < 2 || name.length > 40) return;
    if (/^[\d\s+]+$/.test(name)) return; // تجاهل أرقام الهواتف
    if (!out[href]) out[href] = { url: href, name };
  });
  return Object.values(out).slice(0, 40);
}

// الزحف الكامل بالمتصفّح — seedCats: أقسام معروفة مسبقاً (من الـsitemap) لزيارتها
async function crawlWithBrowser(baseUrl, limit = 100, seedCats = []) {
  let browser;
  const products = new Map(); // url → {url,name,price,image,category}
  try {
    browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-blink-features=AutomationControlled'], timeout: 30000 });
    const origin = new URL(baseUrl).origin;
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1366, height: 900 });
    await page.setDefaultNavigationTimeout(25000);

    // 1) الرئيسية → الأقسام + منتجات الواجهة
    try {
      await page.goto(origin, { waitUntil: 'networkidle2', timeout: 25000 });
      await autoScroll(page, 4000);
    } catch { /* skip */ }
    let cats = [], socials = {}, pages = [];
    try { cats = await page.evaluate(extractCategoryLinksInPage); } catch { cats = []; }
    // ادمج أقسام البذرة (من الـsitemap) مع المكتشفة — بلا تكرار
    if (Array.isArray(seedCats) && seedCats.length) {
      const seen = new Set(cats.map(c => (c.href || '').split('#')[0]));
      seedCats.forEach(c => { const href = (c && c.href || '').split('#')[0]; if (href && !seen.has(href)) { seen.add(href); cats.push({ name: c.name || '', href }); } });
    }
    try { socials = await page.evaluate(extractSocialsInPage); } catch {}
    try { pages = await page.evaluate(extractPagesInPage); } catch {}
    try { (await page.evaluate(extractProductsInPage)).forEach(p => products.set(p.url, { ...p, category: '' })); } catch {}

    // 2) جرّب صفحات منتجات شائعة لو لا أقسام
    if (!cats.length) {
      for (const path of ['/ar/products', '/products', '/ar', '/shop']) {
        try {
          await page.goto(origin + path, { waitUntil: 'networkidle2', timeout: 20000 });
          await autoScroll(page, 5000);
          (await page.evaluate(extractProductsInPage)).forEach(p => { if (!products.has(p.url)) products.set(p.url, { ...p, category: '' }); });
          if (products.size > 5) break;
        } catch { /* skip */ }
      }
    }

    // 3) كل قسم: افتح → مرّر (حتى يتوقّف التحميل) → استخرج المنتجات بقسمها
    //    القسم المزحوف هو مصدر الحقيقة لعضوية المنتج (نفس تصنيف المتجر تماماً)
    for (const cat of cats.slice(0, 30)) {
      if (products.size >= limit) break;
      let href = cat.href; try { href = new URL(cat.href, origin).toString(); } catch (e) { continue; }
      try {
        await page.goto(href, { waitUntil: 'networkidle2', timeout: 22000 });
        await autoScroll(page, 6000); // تمرير لالتقاط منتجات القسم (تحميل كسول) — متوازن مع زمن المزامنة
        const found = await page.evaluate(extractProductsInPage);
        found.forEach(p => {
          const ex = products.get(p.url);
          // عضوية القسم المزحوف لها الأولوية على أي تخمين
          if (ex) { ex.category = cat.name; if (!ex.name && p.name) ex.name = p.name; if (!ex.image && p.image) ex.image = p.image; }
          else products.set(p.url, { ...p, category: cat.name });
        });
      } catch { /* skip */ }
    }

    const all = [...products.values()].filter(p => isProdUrl(p.url)).slice(0, limit);
    logger.info(`[browser-scraper] ${all.length} منتج · ${cats.length} قسم · ${pages.length} صفحة عبر المتصفّح`);
    return { products: all, categories: cats.map(c => c.name), socials, pages };
  } catch (e) {
    logger.warn('[browser-scraper] فشل: ' + (e.message || '').slice(0, 80));
    return { products: [], categories: [] };
  } finally {
    if (browser) try { await browser.close(); } catch {}
  }
}

module.exports = { crawlWithBrowser };
