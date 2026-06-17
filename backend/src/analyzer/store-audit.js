// فحص تقني للمتجر لمساعد التاجر: طرق الدفع · SEO · تجربة المستخدم · الثقة · الأداء (Core Web Vitals)
const cheerio = require('cheerio');
const axios = require('axios');
const logger = require('../logger');

const PAYMENTS = {
  'مدى': [/\bmada\b/i, /مدى/],
  'فيزا': [/\bvisa\b/i, /فيزا/],
  'ماستركارد': [/master[\s_-]?card|ماستر/i],
  'Apple Pay': [/apple[\s_-]?pay|applepay/i],
  'STC Pay': [/stc[\s_-]?pay|stcpay/i],
  'تابي': [/\btabby\b|tabby\.ai/i],
  'تمارا': [/\btamara\b|tamara\.co/i],
  'سداد': [/\bsadad\b|سداد/i],
  'PayPal': [/paypal/i],
  'الدفع عند الاستلام': [/cash[\s_-]?on[\s_-]?delivery|الدفع عند الاستلام|الدفع عند الاستئلام|cod\b/i],
};

function detectPayments($, html) {
  const imgs = [];
  $('img,source').each((_, el) => { ['src', 'data-src', 'data-lazy-src', 'srcset', 'alt'].forEach(a => { const v = $(el).attr(a); if (v) imgs.push(v); }); });
  const zone = $('[class*="payment" i],[class*="footer" i],[id*="footer" i],[class*="method" i],[class*="checkout" i]').text();
  const hay = html + ' ' + imgs.join(' ') + ' ' + zone;
  return Object.entries(PAYMENTS).filter(([, res]) => res.some(re => re.test(hay))).map(([n]) => n);
}

// محور بدرجة من قائمة فحوص (لكل فحص وزن)
function scoreChecks(checks) {
  const total = checks.reduce((s, c) => s + c.w, 0) || 1;
  const got = checks.filter(c => c.ok).reduce((s, c) => s + c.w, 0);
  const score = Math.round(got / total * 100);
  return { score, pass: checks.filter(c => c.ok).map(c => c.label), issues: checks.filter(c => !c.ok).map(c => c.fix) };
}

function auditStore(html, url) {
  const $ = cheerio.load(html || '');
  const https = String(url || '').startsWith('https');
  // ── طرق الدفع ──
  const methods = detectPayments($, html);
  const payment = {
    methods,
    score: methods.length >= 4 ? 100 : methods.length >= 2 ? 70 : methods.length === 1 ? 40 : 10,
    issues: methods.length >= 2 ? [] : ['أضف طرق دفع متعددة (مدى/Apple Pay/تابي/تمارا) لرفع إتمام الطلبات.'],
  };

  // ── SEO والظهور في جوجل ──
  const title = ($('title').text() || '').trim();
  const metaDesc = ($('meta[name="description"]').attr('content') || '').trim();
  const h1 = $('h1').length;
  const ld = $('script[type="application/ld+json"]').length > 0;
  const og = ($('meta[property="og:title"]').length || $('meta[property="og:image"]').length) > 0;
  const canonical = $('link[rel="canonical"]').length > 0;
  const lang = !!$('html').attr('lang');
  const seo = { ...scoreChecks([
    { ok: title.length >= 10 && title.length <= 70, w: 2, label: 'عنوان صفحة مناسب', fix: 'اضبط عنوان الصفحة (10-70 حرفاً) بالكلمة المفتاحية.' },
    { ok: metaDesc.length >= 50, w: 2, label: 'وصف ميتا', fix: 'أضف وصف ميتا (120-160 حرفاً) لكل صفحة.' },
    { ok: h1 >= 1, w: 1, label: 'عنوان H1', fix: 'أضف عنوان H1 واضحاً للصفحة.' },
    { ok: ld, w: 2, label: 'بيانات منظّمة (Schema)', fix: 'أضف Schema للمنتجات لتحسين ظهورك في جوجل.' },
    { ok: og, w: 1, label: 'Open Graph للمشاركة', fix: 'أضف وسوم Open Graph لمظهر أفضل عند المشاركة.' },
    { ok: canonical, w: 1, label: 'رابط Canonical', fix: 'أضف رابط canonical لتفادي تكرار المحتوى.' },
    { ok: lang, w: 1, label: 'لغة الصفحة محدّدة', fix: 'حدّد لغة الصفحة (lang="ar").' },
  ]), title: title.slice(0, 80), metaDesc: metaDesc.slice(0, 160) };

  // ── تجربة المستخدم والتصميم ──
  const viewport = $('meta[name="viewport"]').length > 0;
  const search = $('[type="search"], [class*="search" i], [id*="search" i]').length > 0;
  const cart = /cart|سلة|عربة|basket/i.test(html);
  const breadcrumb = $('[class*="breadcrumb" i],[aria-label*="bread" i]').length > 0;
  const totalImgs = $('img').length;
  const imgsNoAlt = $('img:not([alt]), img[alt=""]').length;
  const altOk = totalImgs === 0 ? true : (imgsNoAlt / totalImgs) < 0.4;
  const ux = scoreChecks([
    { ok: viewport, w: 2, label: 'متوافق مع الجوال', fix: 'أضف وسم viewport ليكون المتجر متجاوباً مع الجوال.' },
    { ok: search, w: 1, label: 'خاصية بحث', fix: 'أضف صندوق بحث ليسهل إيجاد المنتجات.' },
    { ok: cart, w: 1, label: 'سلة مشتريات', fix: 'تأكد من وضوح سلة المشتريات.' },
    { ok: breadcrumb, w: 1, label: 'مسار تنقّل (Breadcrumb)', fix: 'أضف مسار تنقّل لتسهيل التصفّح.' },
    { ok: altOk, w: 1, label: 'نصوص بديلة للصور', fix: `أضف نصاً بديلاً (alt) للصور (${imgsNoAlt} صورة بدون alt).` },
  ]);

  // ── الثقة والتوثيق ──
  const verified = /maroof|معروف|منصة الأعمال|مركز الأعمال|موثّ?ق|business\.sa|الأعمال السعودي|المركز السعودي/i.test(html);
  const trustBadges = /ضمان|مضمون|دفع آمن|secure.*payment|money.?back|آمن/i.test(html);
  const policies = /سياسة|الاستبدال|الاسترجاع|الخصوصية|privacy|return|refund|terms|الشروط/i.test(html);
  const contact = /تواصل|اتصل|whatsapp|wa\.me|tel:|mailto:|الهاتف|جوال/i.test(html);
  const cr = /سجل\s*(ال)?تجاري|رقم السجل|commercial.?reg|الرقم الضريبي|\bc\.?r\.?\s*\d|vat|ضريب/i.test(html);
  const trust = scoreChecks([
    { ok: https, w: 2, label: 'اتصال آمن (SSL)', fix: 'فعّل شهادة SSL (https) فوراً — أساسية للثقة والدفع.' },
    { ok: verified, w: 2, label: 'توثيق المتجر', fix: 'وثّق متجرك (معروف/منصة الأعمال) وأضف الشارة — يرفع ثقة المتسوّق السعودي.' },
    { ok: policies, w: 1, label: 'صفحات السياسات', fix: 'أضف صفحات: الاسترجاع، الخصوصية، الشروط.' },
    { ok: contact, w: 1, label: 'وسيلة تواصل واضحة', fix: 'أبرِز وسيلة تواصل (واتساب/هاتف).' },
    { ok: cr, w: 1, label: 'سجل تجاري/ضريبي', fix: 'أضف السجل التجاري والرقم الضريبي في الفوتر.' },
    { ok: trustBadges, w: 1, label: 'شارات ثقة', fix: 'أضف شارات ثقة (دفع آمن/ضمان).' },
  ]);

  return { payment, seo, ux, trust };
}

// الأداء — Core Web Vitals عبر Google PageSpeed Insights (mobile)
async function auditPerformance(url) {
  try {
    const key = process.env.PAGESPEED_API_KEY;
    const ep = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile${key ? `&key=${key}` : ''}`;
    const { data } = await axios.get(ep, { timeout: 25000 });
    const cats = data.lighthouseResult?.categories || {};
    const a = data.lighthouseResult?.audits || {};
    const score = Math.round((cats.performance?.score ?? 0) * 100);
    return {
      score,
      lcp: a['largest-contentful-paint']?.displayValue || null,
      cls: a['cumulative-layout-shift']?.displayValue || null,
      fcp: a['first-contentful-paint']?.displayValue || null,
      tbt: a['total-blocking-time']?.displayValue || null,
      issues: score >= 50 ? [] : ['حسّن سرعة المتجر: صغّر الصور، قلّل السكربتات، استخدم CDN.'],
      source: 'pagespeed',
    };
  } catch (e) {
    logger.warn('audit performance fail: ' + (e.message || '').slice(0, 60));
    return null;
  }
}

module.exports = { auditStore, auditPerformance };
