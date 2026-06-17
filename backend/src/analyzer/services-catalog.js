'use strict';

/**
 * Services Catalog — يقرأ ملفات خدمات سلة تيبس (CSV) ويبني فهرس مشاكل→خدمات.
 *
 * - الملفات توضع في: backend/src/data/services/*.csv
 * - الأعمدة المتوقعة:
 *   id,name,type,status,price,sale_price,currency,category,url,sold_quantity,rating,problems_solved,description
 * - الكتالوج مرجع ثابت: يُحمّل مرة واحدة في الذاكرة (مع إعادة تحميل تلقائي عند تغيّر الملفات).
 *
 * مهم: لا نُرسل الكتالوج كله للذكاء الاصطناعي — فقط الخدمات المُرشّحة (المطابِقة للمشاكل).
 */

const fs = require('fs');
const path = require('path');

let logger;
try { logger = require('../logger'); } catch { logger = { info: () => {}, warn: () => {} }; }

const DATA_DIR = path.join(__dirname, '..', 'data', 'services');

// ─── تطبيع النص العربي ────────────────────────────────────────────────────────
// إزالة الإيموجي من نصوص الكتالوج (سياسة المنصّة: لا إيموجي في الواجهة)
function stripEmoji(s) {
  return String(s || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{2300}-\u{23FF}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function norm(s) {
  return String(s || '')
    .replace(/ـ/g, '')            // إزالة التطويل ـ
    .replace(/[إأآا]/g, 'ا')           // توحيد الألف
    .replace(/[ىي]/g, 'ي')             // توحيد الياء
    .replace(/ة/g, 'ه')                // توحيد التاء المربوطة
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ─── محلّل CSV بسيط (يدعم الاقتباسات والفواصل والأسطر داخل الحقول) ─────────────
function parseCSV(text) {
  const rows = [];
  let cur = [], field = '', inQ = false;
  // إزالة BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else field += c;
    }
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

// ─── تعريف المشاكل الموحّدة (تتطابق مع صياغة عمود problems_solved) ─────────────
// token: مقطع مميّز يظهر في problems_solved للخدمة التي تحل هذه المشكلة.
// label: تسمية تُعرض للمستخدم.  detect: دالة تكشف المشكلة من نتيجة الفحص.
const PROBLEMS = [
  {
    key: 'payment', token: 'تقسيط', label: 'خيارات دفع محدودة / لا يوجد تقسيط',
    detect: (r) => hasPatternCat(r, 'payment') || missingPay(r),
  },
  {
    key: 'seo', token: 'محركات البحث', label: 'ضعف الظهور في محركات البحث (SEO)',
    detect: (r) => hasPatternCat(r, 'seo') || lowScore(r?.seo?.score) || r?.technicalData?.seoFiles?.hasSitemap === false,
  },
  {
    key: 'design_ux', token: 'تجربة استخدام', label: 'تصميم واجهة غير احترافية / تجربة استخدام ضعيفة',
    detect: (r) => hasPatternCat(r, 'visual') || lowScore(r?.visualScore) || lowScore(r?.ux?.score),
  },
  {
    key: 'shipping', token: 'الشحن والتوصيل', label: 'نقص في إعداد الشحن والتوصيل',
    detect: (r) => hasPatternCat(r, 'checkout') || sc(r, 'hasShippingBadge') === false,
  },
  {
    key: 'analytics', token: 'تتبع', label: 'لا يوجد تتبع/تحليلات للزوار والأداء',
    detect: (r) => !hasTech(r, /analytics|gtag|tag manager|pixel/i),
  },
  {
    key: 'products_content', token: 'منتجات ناقصه', label: 'منتجات ناقصة أو تصوير ضعيف',
    detect: (r) => hasPatternCat(r, 'content') || (sc(r, 'productCount') || 0) < 5 || (sc(r, 'imgsMissingAlt') || 0) > 3,
  },
  {
    key: 'legal', token: 'النظاميه', label: 'التوثيق والمتطلبات النظامية (سجل/وثيقة عمل حر)',
    detect: (r) => sc(r, 'hasCommercialReg') === false && sc(r, 'hasBusinessVerification') === false && sc(r, 'hasTaxNumber') === false,
  },
  {
    key: 'customer_service', token: 'خدمه العملاء', label: 'ضعف خدمة العملاء والتواصل المباشر',
    detect: (r) => sc(r, 'hasWhatsAppFloat') === false && sc(r, 'hasChatWidget') === false,
  },
  {
    key: 'marketing_social', token: 'التواصل الاجتماعي', label: 'ضعف التسويق وحسابات التواصل الاجتماعي',
    detect: (r) => Object.keys((r?.scraped?.socialLinks) || {}).length < 2,
  },
  {
    key: 'domain', token: 'دومين', label: 'عدم وجود دومين/نطاق خاص بالمتجر',
    detect: (r) => isSubdomain(r),
  },
  {
    key: 'new_store', token: 'تاسيس كامل', label: 'المتجر جديد / يحتاج تأسيس كامل',
    detect: (r) => lowScore(r?.overallScore, 45) || (sc(r, 'productCount') || 0) === 0,
  },
  {
    key: 'audit', token: 'تحليل شامل', label: 'يحتاج تقييم/تحليل شامل للمتجر',
    detect: (r) => lowScore(r?.overallScore, 55),
  },
];

// توافق الفئة: كلمات *مميِّزة* فقط (تجنّب العامة مثل «تحسين/محتوى/ربط» لأنها تطابق فئات كثيرة بالخطأ).
// إشارة مساندة فقط — الإشارة الأساسية هي تطابق اسم الخدمة (NAME_KW) بالأسفل.
const CAT_AFFINITY = {
  payment:          ['دفع', 'تقسيط', 'بوابه', 'سداد'],
  seo:              ['seo', 'سيو', 'ارشفه'],
  design_ux:        ['تصميم', 'جرافيك', 'هويه بصريه'],
  shipping:         ['شحن', 'توصيل'],
  analytics:        ['تتبع', 'احصائ', 'بكسل'],
  products_content: ['تصوير', 'وصف منتج', 'منتجات'],
  legal:            ['حكومي', 'توثيق', 'نظامي', 'ضريب', 'زكاه'],
  customer_service: ['خدمه عملاء', 'دعم فني', 'محادثه'],
  marketing_social: ['تسويق', 'اعلان', 'سوشيال', 'سناب', 'انستقرام'],
  domain:           ['دومين', 'نطاق', 'استضافه'],
  new_store:        ['تاسيس', 'انشاء متجر'],
  audit:            ['استشار', 'تقييم', 'اكاديمي'],
};

// الكلمات المفتاحية لاسم/وصف الخدمة — الإشارة *الأقوى* للمطابقة الدقيقة.
// خدمة لا يطابق اسمها مشكلةً ولا فئتها المميّزة لن تُرشَّح لها مهما قال عمود problems_solved.
const NAME_KW = {
  payment:          ['دفع', 'تقسيط', 'تابي', 'تمارا', 'سداد', 'مدى', 'apple pay', 'بوابه دفع', 'بطاقه'],
  seo:              ['seo', 'سيو', 'محرك', 'جوجل', 'ارشفه', 'ظهور في البحث', 'كلمات مفتاحيه', 'محركات البحث'],
  design_ux:        ['تصميم', 'بنر', 'هويه', 'واجهه', 'ثيم', 'قالب', 'شعار', 'لوجو', 'ايقون'],
  shipping:         ['شحن', 'توصيل', 'مندوب', 'تغليف', 'بوليصه'],
  analytics:        ['تتبع', 'تحليلات', 'بكسل', 'احصائ', 'اناليتكس', 'تاج مانجر'],
  products_content: ['وصف المنتج', 'وصف منتج', 'تصوير', 'صور المنتج', 'كتابه وصف', 'رفع المنتجات', 'ادخال المنتجات'],
  legal:            ['توثيق', 'سجل تجاري', 'ضريب', 'زكاه', 'عمل حر', 'نظامي', 'هيئه', 'zatca', 'زاتكا', 'فاتوره'],
  customer_service: ['خدمه عملاء', 'دعم فني', 'واتساب', 'دردشه', 'شات مباشر', 'محادثه', 'رد الي', 'شات بوت'],
  marketing_social: ['تسويق', 'اعلان', 'سوشيال', 'حمله', 'انستقرام', 'تيك توك', 'سناب', 'متابعين', 'هاشتاق', 'مؤثر', 'نشر'],
  domain:           ['دومين', 'نطاق', 'استضافه'],
  new_store:        ['تاسيس', 'انشاء متجر', 'متجر متكامل', 'باقه تاسيس', 'اطلاق متجر'],
  audit:            ['تحليل شامل', 'استشار', 'تقييم متجر', 'دراسه', 'خطه عمل'],
};

// ─── أدوات الكشف المساعدة (كلها دفاعية) ───────────────────────────────────────
function hasPatternCat(r, cat) {
  return Array.isArray(r?.patternIssues) && r.patternIssues.some(i => i?.category === cat);
}
function sc(r, key) { return r?.scraped ? r.scraped[key] : undefined; }
function lowScore(v, threshold = 60) { return typeof v === 'number' && v < threshold; }
function missingPay(r) {
  const pm = sc(r, 'paymentMethods');
  if (!Array.isArray(pm)) return false;
  const joined = pm.join(' ').toLowerCase();
  return !/tabby|tamara|تابي|تمارا/.test(joined);
}
function hasTech(r, re) {
  const t = sc(r, 'technologies');
  return Array.isArray(t) && t.some(x => re.test(String(x)));
}
function isSubdomain(r) {
  try {
    const host = new URL(r?._storeUrl || '').hostname.toLowerCase();
    return /\.salla\.sa$/.test(host) || /\.zid\.store$/.test(host) || host.split('.').length > 2;
  } catch { return false; }
}

// ─── تحميل الكتالوج (Lazy + إعادة تحميل عند تغيّر الملفات) ─────────────────────
let _cache = null;
let _sig = '';

function _filesSignature() {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.toLowerCase().endsWith('.csv'));
    return files.map(f => {
      const st = fs.statSync(path.join(DATA_DIR, f));
      return `${f}:${st.size}:${st.mtimeMs}`;
    }).sort().join('|');
  } catch { return ''; }
}

function load() {
  const sig = _filesSignature();
  if (_cache && sig === _sig) return _cache;

  const services = [];
  const seen = new Set();
  let files = [];
  try { files = fs.readdirSync(DATA_DIR).filter(f => f.toLowerCase().endsWith('.csv')); }
  catch { logger.warn(`services-catalog: مجلد البيانات غير موجود (${DATA_DIR})`); }

  for (const file of files) {
    let text;
    try { text = fs.readFileSync(path.join(DATA_DIR, file), 'utf8'); }
    catch { continue; }
    const rows = parseCSV(text);
    if (rows.length < 2) continue;
    const header = rows[0].map(h => norm(h));
    const idx = (name) => header.indexOf(norm(name));
    const col = {
      id: idx('id'), name: idx('name'), type: idx('type'), status: idx('status'),
      price: idx('price'), sale_price: idx('sale_price'), currency: idx('currency'),
      category: idx('category'), url: idx('url'), sold: idx('sold_quantity'),
      rating: idx('rating'), problems: idx('problems_solved'), desc: idx('description'),
    };
    if (col.name < 0) continue;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[col.name]) continue;
      const id = col.id >= 0 ? (row[col.id] || '').trim() : '';
      const key = id || row[col.name].trim();
      if (seen.has(key)) continue;
      seen.add(key);
      const problems = col.problems >= 0 ? (row[col.problems] || '') : '';
      services.push({
        id,
        name: stripEmoji((row[col.name] || '').trim()),
        type: col.type >= 0 ? (row[col.type] || '').trim() : '',
        status: col.status >= 0 ? (row[col.status] || '').trim() : '',
        price: col.price >= 0 ? num(row[col.price]) : 0,
        salePrice: col.sale_price >= 0 ? num(row[col.sale_price]) : 0,
        currency: col.currency >= 0 ? (row[col.currency] || 'SAR').trim() : 'SAR',
        category: col.category >= 0 ? (row[col.category] || '').trim() : '',
        url: col.url >= 0 ? (row[col.url] || '').trim() : '',
        sold: col.sold >= 0 ? num(row[col.sold]) : 0,
        rating: col.rating >= 0 ? num(row[col.rating]) : 0,
        problemsSolved: stripEmoji(problems.trim()),
        _problemsNorm: norm(problems),
        _declaredCount: problems.split('|').filter(x => x.trim()).length || 1,
        description: stripEmoji(col.desc >= 0 ? (row[col.desc] || '').trim() : ''),
      });
    }
  }

  _cache = services;
  _sig = sig;
  logger.info(`services-catalog: تم تحميل ${services.length} خدمة من ${files.length} ملف`);
  return _cache;
}

function num(v) {
  const n = parseFloat(String(v || '').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
}

// ─── الترشيح: مشاكل الفحص → خدمات مطابِقة ─────────────────────────────────────
/**
 * @param {object} analysis  نتيجة الفحص (مع _storeUrl لكشف الدومين)
 * @param {number} limit     أقصى عدد خدمات
 * @returns {Array} خدمات مُرشّحة بشكل مبسّط جاهز للعرض/التغذية
 */
function recommendServices(analysis, limit = 4) {
  // المشاكل المكتشفة (مرتّبة حسب الأولوية في تعريف PROBLEMS)
  const detected = PROBLEMS.filter(p => { try { return p.detect(analysis); } catch { return false; } });
  const detectedTokens = detected.map(p => ({ key: p.key, token: norm(p.token), label: p.label }));
  return _selectByTokens(detectedTokens, limit);
}

/**
 * ترشيح خدمات حسب مفاتيح مشاكل صريحة (مثلاً من أداة "مسار التاجر").
 * @param {string[]} keys   مفاتيح من PROBLEMS (payment, seo, design_ux, ...)
 * @param {number}  limit
 */
function recommendByKeys(keys, limit = 6) {
  const set = new Set(keys || []);
  const detectedTokens = PROBLEMS.filter(p => set.has(p.key))
    .map(p => ({ key: p.key, token: norm(p.token), label: p.label }));
  return _selectByTokens(detectedTokens, limit);
}

// النواة المشتركة للترشيح: من قائمة مشاكل → خدمات متنوّعة ومناسبة
function _selectByTokens(detectedTokens, limit = 4) {
  const all = load();
  if (!all.length) return [];

  // استبعاد الخدمات العامة/التجريبية اللي بتشوّش الترشيح
  const JUNK = /\btest\b|تجريب|طقم كلاسيك|خدمه حسب الطلب|خدمه استكمال|اقتراح .* اسماء|نموذج |شيت |كتيب/;
  const isJunk = (s) => JUNK.test(norm(s.name));
  const pool0 = all.filter(s => !isJunk(s));

  // درجة الجودة: خدمة فعلية > كتاب/منتج رقمي، ثم تخصّص (تركيز)، ثم تقييم، ثم مبيعات
  const specTier = (s) => (s._declaredCount <= 2 ? 2 : s._declaredCount <= 4 ? 1 : 0);
  const isService = (s) => /service/i.test(s.type);
  const quality = (s) =>
    (isService(s) ? 1.5 : 0) +
    specTier(s) * 1.2 +
    (s.rating || 0) / 5 +
    Math.min((s.sold || 0) / 1000, 1) * 0.5;

  // إشارات الصلة (مرتّبة بالقوة): اسم الخدمة (الأقوى) > فئة مميّزة > وصف/وسم (الأضعف)
  const kwHits = (text, key) => {
    const kws = NAME_KW[key];
    if (!kws) return 0;
    const hay = norm(text || '');
    return kws.reduce((n, k) => n + (hay.includes(norm(k)) ? 1 : 0), 0);
  };
  const nameHits = (s, key) => (s._nameNorm || (s._nameNorm = norm(s.name)), kwHits(s._nameNorm, key));
  const descHits = (s, key) => (s._descNorm || (s._descNorm = norm(s.description || '')), kwHits(s._descNorm, key));
  const catHit = (s, key) => {
    const cats = CAT_AFFINITY[key];
    if (!cats) return 0;
    const c = norm(s.category);
    return cats.some(k => c.includes(norm(k))) ? 1 : 0;
  };
  const tagHit = (s, d) => (s._problemsNorm.includes(d.token) ? 1 : 0);
  // اسم مطابق = 5 (يكفي وحده) · فئة مميّزة(2)+وسم(1)=3 (يكفي) · وصف(1)/وسم(1) وحدهما لا يكفيان
  const relevance = (s, d) => nameHits(s, d.key) * 5 + catHit(s, d.key) * 2 + descHits(s, d.key) + tagHit(s, d);
  const MIN_REL = 3;

  // أسباب الترشيح = فقط المشاكل التي للخدمة صلة حقيقية بها (وليس مجرد وسم)
  const reasonsOf = (svc) => detectedTokens.filter(d => relevance(svc, d) >= MIN_REL).map(d => d.label);

  // 3) ترشيح متنوّع: أفضل خدمة *ذات صلة فعلية* لكل مشكلة
  const chosen = [];
  const usedIds = new Set();
  const pick = (svc, reasons) => {
    const key = svc.id || svc.name;
    if (usedIds.has(key)) return;
    usedIds.add(key);
    chosen.push({ svc, reasons });
  };

  for (const d of detectedTokens) {
    if (chosen.length >= limit) break;
    const candidates = pool0
      .filter(s => !usedIds.has(s.id || s.name) && relevance(s, d) >= MIN_REL);
    if (!candidates.length) continue;
    const ranked = candidates
      .sort((a, b) => (relevance(b, d) + quality(b)) - (relevance(a, d) + quality(a)));
    pick(ranked[0], reasonsOf(ranked[0]));
  }

  // 4) لو لسه فاضي مكان: كمّل بأكثر الخدمات تغطيةً (بصلة حقيقية فقط)
  if (chosen.length < limit && detectedTokens.length) {
    pool0.map(s => ({ s, r: reasonsOf(s) }))
      .filter(x => x.r.length && !usedIds.has(x.s.id || x.s.name))
      .sort((a, b) => b.r.length - a.r.length || quality(b.s) - quality(a.s))
      .forEach(x => { if (chosen.length < limit) pick(x.s, x.r); });
  }

  // 5) fallback نهائي: لو ما اكتُشفت مشاكل، رجّع أكثر الخدمات مبيعاً
  if (!chosen.length) {
    [...pool0].sort((a, b) => b.sold - a.sold || b.rating - a.rating)
      .slice(0, limit).forEach(s => pick(s, []));
  }

  return chosen.slice(0, limit).map(({ svc, reasons }) => ({
    id: svc.id,
    name: svc.name,
    price: svc.price,
    salePrice: svc.salePrice,
    currency: svc.currency,
    category: svc.category,
    url: svc.url,
    rating: svc.rating,
    reasons,
  }));
}

// ─── معرفة المساعد: ملخص مُدمج للكتالوج (بدون أوصاف طويلة) ─────────────────────
/**
 * معرفة المساعد بالكتالوج — مضغوطة لتبقى ضمن حدود نماذج الـ fallback الصغيرة (Groq ~6000 TPM).
 * تُجمَّع الخدمات حسب الفئة (اسم + سعر فقط) لتقليل التوكنز مع تغطية كل الخدمات قدر الإمكان.
 * @param {number} budgetChars  أقصى حجم نصّي (حرف) — افتراضي يترك مساحة آمنة لبقية البرومبت
 */
function catalogSummaryForChat(budgetChars = 6500) {
  const all = load();
  if (!all.length) return '';
  // الأكثر مبيعاً أولاً حتى لو احتجنا القص يبقى الأهم موجوداً
  const sorted = [...all].sort((a, b) => b.sold - a.sold || b.rating - a.rating);
  const byCat = new Map();
  for (const s of sorted) {
    const cat = s.category || 'خدمات أخرى';
    if (!byCat.has(cat)) byCat.set(cat, []);
    const price = s.price > 0 ? `${s.price}${s.currency === 'SAR' ? 'ر' : ''}` : 'مجاناً';
    byCat.get(cat).push(`${s.name} (${price})`);
  }
  let out = '';
  for (const [cat, items] of byCat) {
    const line = `■ ${cat}: ${items.join(' · ')}\n`;
    if (out.length + line.length > budgetChars) {
      out += `... والمزيد (${all.length} خدمة إجمالاً)\n`;
      break;
    }
    out += line;
  }
  return out.trim();
}

function stats() {
  const all = load();
  return { count: all.length, dataDir: DATA_DIR };
}

module.exports = {
  load,
  recommendServices,
  recommendByKeys,
  catalogSummaryForChat,
  stats,
  PROBLEMS,
  _norm: norm,
};
