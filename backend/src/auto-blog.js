// ─────────────────────────────────────────────────────────────────────────────
// محرّك المحتوى الذاتي — يولّد مقالات SEO عربية للتاجر السعودي وينشرها تلقائياً
// يعمل على الخادم عبر node-cron (٣ مقالات/أسبوع) بدون أي تدخّل يدوي.
// المفاتيح (Gemini/Groq) مقروءة من نفس بيئة الخادم؛ الإدراج مباشر في blog_posts.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const db = require('./config/db');
const { aiJSON } = require('./ai');
const logger = require('./logger');

const SITE = 'https://adwat.cloud';

// ── بنك المواضيع الاستراتيجي ──────────────────────────────────────────────────
// كل موضوع يستهدف كلمات مفتاحية للتاجر السعودي ويربط داخلياً بصفحة أداة/خدمة
// (روابط داخلية = SEO أقوى + تحويل الزائر لمستخدم/مشترك/عميل خدمات).
const TOPICS = [
  { t: 'كيف تكتب وصف منتج احترافي يزيد مبيعاتك في متجر سلة أو زد', cat: 'تجارة إلكترونية', kw: ['وصف المنتج','متجر سلة','زيادة المبيعات'], tool: 'generator.html', toolName: 'مولّد أوصاف المنتجات' },
  { t: 'دليل تحسين محركات البحث (SEO) للمتاجر الإلكترونية في السعودية', cat: 'تحسين محركات البحث', kw: ['SEO','متجر إلكتروني','جوجل'], tool: 'analyzer.html', toolName: 'محلل المتجر' },
  { t: 'أفضل استراتيجيات التسعير لزيادة أرباح متجرك الإلكتروني', cat: 'تجارة إلكترونية', kw: ['التسعير','هامش الربح','الأرباح'], tool: 'calculator.html', toolName: 'حاسبة الأرباح والتسعير' },
  { t: 'كيف تصمم كوبونات خصم تجذب العملاء دون أن تخسر أرباحك', cat: 'تسويق', kw: ['كوبونات خصم','عروض','تسويق'], tool: 'coupons.html', toolName: 'أداة الكوبونات' },
  { t: 'التقويم التسويقي للمتاجر السعودية: المناسبات التي تضاعف مبيعاتك', cat: 'تسويق', kw: ['التقويم التسويقي','المواسم','اليوم الوطني'], tool: 'calendar.html', toolName: 'التقويم التسويقي' },
  { t: 'التسويق عبر واتساب للأعمال: دليل عملي لأصحاب المتاجر', cat: 'تسويق', kw: ['واتساب للأعمال','تسويق واتساب','رسائل العملاء'], tool: 'whatsapp.html', toolName: 'أداة رسائل واتساب' },
  { t: 'خطة محتوى السوشيال ميديا لمتجرك: من الفكرة إلى النشر', cat: 'تسويق', kw: ['سوشيال ميديا','خطة محتوى','انستقرام'], tool: 'social-plan.html', toolName: 'مولّد خطة السوشيال' },
  { t: 'سياسات المتجر الإلكتروني: الاسترجاع والشحن والخصوصية بشكل قانوني', cat: 'تجارة إلكترونية', kw: ['سياسات المتجر','الاسترجاع','الشحن'], tool: 'store-policies.html', toolName: 'مولّد سياسات المتجر' },
  { t: 'كيف تطلق منتجاً جديداً بحملة تسويقية ناجحة خطوة بخطوة', cat: 'تسويق', kw: ['إطلاق منتج','حملة تسويقية','مبيعات'], tool: 'launch-campaign.html', toolName: 'مولّد حملة الإطلاق' },
  { t: 'تحليل المنافسين في التجارة الإلكترونية: كيف تتفوق على متاجر منطقتك', cat: 'تجارة إلكترونية', kw: ['تحليل المنافسين','السوق','التميز'], tool: 'competitor.html', toolName: 'أداة تحليل المنافسين' },
  { t: 'الصور الاحترافية للمنتجات: كيف ترفع معدل التحويل في متجرك', cat: 'تجارة إلكترونية', kw: ['صور المنتجات','التصوير','معدل التحويل'], tool: 'image-gen.html', toolName: 'مولّد صور المنتجات' },
  { t: 'لماذا يحتاج متجرك تصميماً احترافياً؟ وكيف تبدأ خطوة بخطوة', cat: 'تصميم متاجر', kw: ['تصميم متجر','هوية بصرية','تجربة المستخدم'], tool: 'services.html', toolName: 'خدمات تصميم المتاجر' },
  { t: 'دليل المبتدئين لفتح متجر إلكتروني في السعودية: الترخيص والمنصة والتسويق', cat: 'تجارة إلكترونية', kw: ['فتح متجر','التجارة الإلكترونية','السعودية'], tool: 'services.html', toolName: 'خدمات إنشاء المتاجر' },
  { t: 'كيف تستخدم الذكاء الاصطناعي لإدارة متجرك وتوفير وقتك', cat: 'أدوات الذكاء الاصطناعي', kw: ['الذكاء الاصطناعي','أتمتة','إدارة المتجر'], tool: 'tools.html', toolName: 'أدوات أدوات التاجر' },
  { t: 'أخطاء شائعة تقتل مبيعات متجرك الإلكتروني وكيف تتجنبها', cat: 'تجارة إلكترونية', kw: ['أخطاء المتاجر','زيادة المبيعات','تحسين'], tool: 'analyzer.html', toolName: 'محلل المتجر' },
  { t: 'كيف تبني ثقة العملاء في متجرك الإلكتروني وتزيد الطلبات', cat: 'تسويق', kw: ['ثقة العملاء','التقييمات','المصداقية'], tool: 'services.html', toolName: 'خدمات أدوات التاجر' },
  { t: 'التسويق في المواسم السعودية: رمضان واليوم الوطني والجمعة البيضاء', cat: 'تسويق', kw: ['رمضان','الجمعة البيضاء','عروض المواسم'], tool: 'calendar.html', toolName: 'التقويم التسويقي' },
  { t: 'من متجر إلى علامة تجارية: كيف تبني هوية تميّزك عن المنافسين', cat: 'تصميم متاجر', kw: ['العلامة التجارية','الهوية','التميز'], tool: 'services.html', toolName: 'خدمات الهوية والتصميم' },
];

function slugify(text) {
  return text.trim().replace(/\s+/g, '-').replace(/[^؀-ۿ\w-]/g, '').toLowerCase().substring(0, 80);
}

// سجلّ دائم للمواضيع المستخدمة (موثوق — لا يعتمد على عنوان الذكاء الاصطناعي)
db.query(`
  CREATE TABLE IF NOT EXISTS auto_blog_log (
    id         SERIAL PRIMARY KEY,
    topic_key  TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(() => {});

// اختَر موضوعاً لم يُستخدم بعد؛ وإن استُنفدت كلها اختر الأقدم استخداماً (LRU) بزاوية جديدة
async function pickTopic() {
  let usage = new Map(); // topic_key -> آخر استخدام
  try {
    const { rows } = await db.query('SELECT topic_key, MAX(created_at) AS last FROM auto_blog_log GROUP BY topic_key');
    for (const r of rows) usage.set(r.topic_key, r.last);
  } catch { /* الجدول قد لا يكون جاهزاً بعد */ }

  const unused = TOPICS.filter(tp => !usage.has(tp.t));
  if (unused.length) return unused[Math.floor(Math.random() * unused.length)];

  // كل المواضيع استُخدمت — اختر الأقدم استخداماً واطلب زاوية جديدة
  const sorted = [...TOPICS].sort((a, b) => new Date(usage.get(a.t) || 0) - new Date(usage.get(b.t) || 0));
  return { ...sorted[0], fresh: true };
}

function buildPrompt(topic) {
  const toolUrl = `${SITE}/pages/${topic.tool}`;
  return `أنت كاتب محتوى تسويقي خبير في التجارة الإلكترونية والسوق السعودي، تكتب لمدوّنة منصة "أدوات التاجر" (${SITE}) — منصة سعودية تقدّم أدوات ذكاء اصطناعي وخدمات لأصحاب المتاجر الإلكترونية (سلة، زد، وغيرها).

اكتب مقالاً احترافياً${topic.fresh ? ' بزاوية جديدة ومبتكرة' : ''} بعنوان يدور حول: "${topic.t}".

المتطلبات الصارمة:
- اللغة: عربية فصحى واضحة وسلسة موجّهة للتاجر السعودي (استخدم أمثلة من السوق السعودي: سلة، زد، مدى، الجمعة البيضاء، اليوم الوطني عند المناسبة).
- الطول: بين 900 و1400 كلمة، محتوى أصيل عملي عالي القيمة (E-E-A-T)، لا حشو.
- الكلمات المفتاحية المستهدفة (استخدمها طبيعياً في العناوين والفقرات): ${topic.kw.join('، ')}.
- البنية: مقدمة جذّابة، ثم عناوين فرعية <h2> و<h3>، فقرات <p>، قوائم <ul><li>، وحيث يناسب <blockquote> أو <strong>.
- أدرج قسم أسئلة شائعة (FAQ) من ٣ إلى ٥ أسئلة داخل عناوين <h3> وأجوبتها <p> قرب النهاية.
- رابط داخلي إجباري: اذكر أداة "${topic.toolName}" من "أدوات التاجر" بشكل طبيعي داخل المقال كحل عملي، ضمن وسم <a href="${toolUrl}">${topic.toolName}</a> (مرة أو مرتين، غير مقحمة).
- خاتمة فيها دعوة لطيفة لتجربة أدوات "أدوات التاجر" المجانية أو الاطلاع على خدماتنا (<a href="${SITE}/pages/services.html">خدماتنا</a>).
- المحتوى (content) HTML نظيف فقط: استخدم <h2><h3><p><ul><li><strong><blockquote><a> — بدون <html> أو <head> أو <body> أو <style> أو <script> أو صور، وبدون Markdown.

أعِد JSON صارماً بهذا الشكل بالضبط:
{
  "title": "عنوان جذّاب ≤ 70 حرفاً يحوي كلمة مفتاحية",
  "excerpt": "ملخص تشويقي 140-160 حرفاً (وصف ميتا)",
  "content": "<h2>...</h2><p>...</p> ... كامل المقال بصيغة HTML",
  "category": "${topic.cat}",
  "tags": ["وسم1","وسم2","وسم3","وسم4"],
  "read_time": 6
}`;
}

// أعِد توليد sitemap.xml ليشمل مقالات المدونة المنشورة (يُخدَم عبر nginx من جذر المستودع)
async function regenerateSitemap() {
  try {
    const repoRoot = path.join(__dirname, '..', '..'); // backend/src -> backend -> repo root
    const sitemapPath = path.join(repoRoot, 'sitemap.xml');
    if (!fs.existsSync(sitemapPath)) { logger.warn('[auto-blog] sitemap.xml غير موجود — تخطّي التحديث'); return; }
    const original = fs.readFileSync(sitemapPath, 'utf8');
    // احذف كتلة المدونة القديمة المُدارة تلقائياً إن وُجدت
    let base = original.replace(/\s*<!-- BLOG:START -->[\s\S]*?<!-- BLOG:END -->/g, '');

    const { rows } = await db.query(
      'SELECT slug, updated_at FROM blog_posts WHERE is_published=true ORDER BY created_at DESC LIMIT 500'
    );
    if (!rows.length) { fs.writeFileSync(sitemapPath, base, 'utf8'); return; }

    const entries = rows.map(r => {
      const loc = `${SITE}/pages/blog-post.html?slug=${encodeURIComponent(r.slug)}`;
      const lastmod = (r.updated_at ? new Date(r.updated_at) : new Date()).toISOString().slice(0, 10);
      return `  <url><loc>${loc}</loc><priority>0.6</priority><changefreq>monthly</changefreq><lastmod>${lastmod}</lastmod></url>`;
    }).join('\n');

    const block = `\n  <!-- BLOG:START -->\n${entries}\n  <!-- BLOG:END -->`;
    const updated = base.replace(/\n?<\/urlset>\s*$/, `${block}\n</urlset>\n`);
    fs.writeFileSync(sitemapPath, updated, 'utf8');
    logger.info(`[auto-blog] sitemap محدّث بـ ${rows.length} مقال`);
  } catch (e) {
    logger.warn('[auto-blog] فشل تحديث sitemap: ' + e.message);
  }
}

// ولّد مقالاً واحداً وانشره
async function generateAndPublish() {
  const topic = await pickTopic();
  logger.info('[auto-blog] توليد مقال: ' + topic.t.slice(0, 50));
  let art;
  try {
    art = await aiJSON(buildPrompt(topic), { temperature: 0.7, maxTokens: 8192 });
  } catch (e) {
    logger.error('[auto-blog] فشل التوليد بالذكاء الاصطناعي: ' + e.message);
    throw e;
  }
  if (!art || !art.title || !art.content) {
    throw new Error('مخرجات الذكاء الاصطناعي غير صالحة');
  }

  // تنظيف: أزل أي وسوم خطيرة إن تسرّبت
  const content = String(art.content)
    .replace(/<\/?(script|style|iframe|html|head|body|link|meta)[^>]*>/gi, '')
    .trim();

  let slug = slugify(art.title);
  const { rows: existing } = await db.query('SELECT id FROM blog_posts WHERE slug=$1', [slug]);
  if (existing.length) slug = slug + '-' + Date.now();

  const tags = Array.isArray(art.tags) ? art.tags.slice(0, 8) : (topic.kw || []);
  const readTime = Number(art.read_time) > 0 ? Math.min(20, Number(art.read_time)) : 6;

  const { rows } = await db.query(
    `INSERT INTO blog_posts (title,slug,excerpt,content,cover_image,category,tags,author_name,is_published,read_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9) RETURNING id,slug,title`,
    [art.title.slice(0, 200), slug, (art.excerpt || '').slice(0, 300), content, null,
     art.category || topic.cat || 'عام', tags, 'فريق أدوات التاجر', readTime]
  );
  logger.info(`[auto-blog] ✓ نُشر مقال #${rows[0].id}: ${rows[0].title.slice(0, 50)}`);

  // سجّل الموضوع المستخدم (لمنع التكرار مستقبلاً)
  db.query('INSERT INTO auto_blog_log (topic_key) VALUES ($1)', [topic.t]).catch(() => {});

  await regenerateSitemap();
  return rows[0];
}

module.exports = { generateAndPublish, regenerateSitemap, pickTopic, TOPICS };
