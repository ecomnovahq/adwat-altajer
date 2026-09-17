const router = require('express').Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { adminAuth } = require('../middleware/auth');
const { sendMail } = require('../mailer');
const logger = require('../logger');

const SITE = 'https://adwat.cloud';

// جدول المشتركين في النشرة البريدية
db.query(`
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id          SERIAL PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    name        TEXT,
    token       TEXT UNIQUE NOT NULL,
    is_active   BOOLEAN DEFAULT true,
    source      TEXT DEFAULT 'blog',
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => process.stderr.write(`[newsletter] table init error: ${e.message}\n`));

const brandFooter = (token) => `
  <div style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:14px;">
    أدوات التاجر — منصة أدوات وخدمات المتاجر الإلكترونية · <a href="${SITE}" style="color:#7c3aed;">adwat.cloud</a><br>
    ${token ? `لإلغاء الاشتراك <a href="${SITE}/api/newsletter/unsubscribe?token=${token}" style="color:#94a3b8;">اضغط هنا</a>` : ''}
  </div>`;

// ── اشتراك (عام) ──────────────────────────────────────────────────────────────
router.post(
  '/subscribe',
  [body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { email, name, source } = req.body;
    try {
      const { rows: existing } = await db.query('SELECT id, is_active, token FROM newsletter_subscribers WHERE email=$1', [email]);
      let token;
      if (existing.length) {
        token = existing[0].token;
        if (!existing[0].is_active) await db.query('UPDATE newsletter_subscribers SET is_active=true WHERE email=$1', [email]);
        else return res.json({ message: 'أنت مشترك بالفعل في النشرة ✅', already: true });
      } else {
        token = crypto.randomBytes(16).toString('hex');
        await db.query(
          'INSERT INTO newsletter_subscribers (email, name, token, source) VALUES ($1,$2,$3,$4)',
          [email, (name || '').slice(0, 100) || null, token, (source || 'blog').slice(0, 40)]
        );
      }
      // بريد ترحيبي
      sendMail({
        to: email,
        subject: 'أهلاً بك في نشرة أدوات التاجر 🎉',
        html: `<div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:1.9;color:#1a1a2e;max-width:600px;">
          <h2 style="color:#7c3aed;">أهلاً بك في نشرة أدوات التاجر 🎉</h2>
          <p>شكراً لاشتراكك! ستصلك أفضل النصائح العملية لزيادة مبيعات متجرك الإلكتروني في السعودية — تسويق، تسعير، SEO، ومواسم البيع.</p>
          <p>بالمناسبة، جرّب أدواتنا المجانية الآن:</p>
          <p><a href="${SITE}/pages/tools.html" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;">استكشف الأدوات</a></p>
          ${brandFooter(token)}
        </div>`
      }).catch(() => {});
      logger.info(`[newsletter] اشتراك جديد: ${email}`);
      res.status(201).json({ message: 'تم اشتراكك بنجاح! تحقق من بريدك ✅' });
    } catch (e) {
      logger.error('[newsletter] subscribe error: ' + e.message);
      res.status(500).json({ error: 'تعذّر الاشتراك، حاول لاحقاً' });
    }
  }
);

// ── إلغاء الاشتراك (عام، برابط من البريد) ─────────────────────────────────────
router.get('/unsubscribe', async (req, res) => {
  const { token } = req.query;
  const page = (msg) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1"><title>إلغاء الاشتراك</title></head>
    <body style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;text-align:center;padding:60px 20px;color:#1a1a2e;">
    <div style="max-width:460px;margin:auto;background:#fff;border-radius:16px;padding:36px;box-shadow:0 8px 30px rgba(0,0,0,.06);">
    <h2 style="color:#7c3aed;">${msg}</h2>
    <p><a href="${SITE}" style="color:#7c3aed;">العودة إلى أدوات التاجر</a></p></div></body></html>`;
  if (!token) return res.status(400).send(page('رابط غير صالح'));
  try {
    const { rowCount } = await db.query('UPDATE newsletter_subscribers SET is_active=false WHERE token=$1', [token]);
    res.send(page(rowCount ? 'تم إلغاء اشتراكك. نأسف لرحيلك 🙏' : 'الاشتراك غير موجود'));
  } catch {
    res.status(500).send(page('حدث خطأ، حاول لاحقاً'));
  }
});

// ── عدد المشتركين (عام) ───────────────────────────────────────────────────────
router.get('/count', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT COUNT(*)::int AS c FROM newsletter_subscribers WHERE is_active=true');
    res.json({ count: rows[0].c });
  } catch { res.json({ count: 0 }); }
});

// ── قائمة المشتركين (admin) ───────────────────────────────────────────────────
router.get('/admin/list', adminAuth, async (_req, res) => {
  const { rows } = await db.query('SELECT id,email,name,is_active,source,created_at FROM newsletter_subscribers ORDER BY created_at DESC');
  res.json(rows);
});

// ── إرسال نشرة تجميعية بأحدث المقالات لكل المشتركين النشطين ────────────────────
async function sendDigest({ days = 7 } = {}) {
  const { rows: posts } = await db.query(
    `SELECT title, slug, excerpt FROM blog_posts
     WHERE is_published=true AND created_at > NOW() - INTERVAL '${days} days'
     ORDER BY created_at DESC LIMIT 6`
  );
  if (!posts.length) { logger.info('[newsletter] لا مقالات جديدة — تخطّي النشرة'); return { sent: 0, posts: 0 }; }
  const { rows: subs } = await db.query('SELECT email, token FROM newsletter_subscribers WHERE is_active=true');
  if (!subs.length) { logger.info('[newsletter] لا مشتركين نشطين'); return { sent: 0, posts: posts.length }; }

  const items = posts.map(p => `
    <div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #eef2f7;">
      <a href="${SITE}/pages/blog-post.html?slug=${encodeURIComponent(p.slug)}" style="color:#7c3aed;font-size:17px;font-weight:700;text-decoration:none;">${p.title}</a>
      <p style="color:#475569;margin:6px 0 0;">${(p.excerpt || '').slice(0, 160)}</p>
    </div>`).join('');

  let sent = 0;
  for (const s of subs) {
    const html = `<div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:1.9;color:#1a1a2e;max-width:600px;">
      <h2 style="color:#7c3aed;">جديد مدوّنة أدوات التاجر 📩</h2>
      <p>أحدث المقالات لمساعدتك في تنمية متجرك:</p>
      ${items}
      <p style="margin-top:18px;"><a href="${SITE}/pages/blog.html" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;">اقرأ كل المقالات</a></p>
      ${brandFooter(s.token)}
    </div>`;
    try { await sendMail({ to: s.email, subject: 'جديد مدوّنة أدوات التاجر — نصائح لمتجرك 📩', html }); sent++; }
    catch { /* تابع البقية */ }
    await new Promise(r => setTimeout(r, 400));
  }
  logger.info(`[newsletter] نشرة أُرسلت لـ ${sent}/${subs.length} مشترك (${posts.length} مقال)`);
  return { sent, posts: posts.length };
}

// ── بنك الأدوات المميّزة (يدور يومياً) ────────────────────────────────────────
const FEATURED_TOOLS = [
  { name: 'محلل المتجر', url: '/pages/analyzer.html', desc: 'حلّل متجرك واكتشف نقاط تحسين مبيعاتك فوراً.' },
  { name: 'مولّد أوصاف المنتجات', url: '/pages/generator.html', desc: 'اكتب أوصاف منتجات احترافية تبيع بضغطة زر.' },
  { name: 'مولّد صور المنتجات', url: '/pages/image-gen.html', desc: 'صور منتجات احترافية بالذكاء الاصطناعي بلا استوديو.' },
  { name: 'حاسبة الأرباح والتسعير', url: '/pages/calculator.html', desc: 'سعّر منتجاتك بذكاء واعرف صافي ربحك بدقة.' },
  { name: 'محلل المنافسين', url: '/pages/competitor.html', desc: 'اعرف نقاط قوة منافسيك وكيف تتفوّق عليهم.' },
  { name: 'مولّد حملة الإطلاق', url: '/pages/launch-campaign.html', desc: 'خطة إطلاق متكاملة لمنتجك الجديد في دقائق.' },
  { name: 'مولّد خطة السوشيال', url: '/pages/social-plan.html', desc: 'خطة محتوى شهرية جاهزة لمنصاتك الاجتماعية.' },
  { name: 'رسائل واتساب', url: '/pages/whatsapp.html', desc: 'قوالب واتساب احترافية لاستعادة السلات والعملاء.' },
  { name: 'التقويم التسويقي', url: '/pages/calendar.html', desc: 'خطّط مبيعاتك حسب مواسم السوق السعودي.' },
  { name: 'مولّد سياسات المتجر', url: '/pages/store-policies.html', desc: 'سياسات متجر متوافقة ونظامية في دقائق.' },
  { name: 'أداة الكوبونات', url: '/pages/coupons.html', desc: 'صمّم عروض وكوبونات تزيد مبيعاتك بذكاء.' },
];

// ── بنك نصائح احتياطي (يُستخدم لو تعذّر توليد نصيحة بالذكاء الاصطناعي) ──────────
const FALLBACK_TIPS = [
  { title: 'اكتب وصف منتجك بلغة العميل', body: 'ركّز على الفائدة التي يجنيها العميل لا على المواصفات فقط. جملة مثل «يوفّر لك وقت التحضير في الصباح» تبيع أكثر من سرد المكوّنات.' },
  { title: 'استغل الدفع بالتقسيط', body: 'إتاحة خيارات الدفع بالتقسيط في متجرك ترفع متوسط قيمة الطلب بشكل ملحوظ — أبرزها بوضوح في صفحة المنتج.' },
  { title: 'صور المنتج هي بائعك الصامت', body: 'صورة واضحة بخلفية نظيفة وزوايا متعددة تقلّل التردّد وترفع معدّل التحويل. جرّب توليد صور احترافية بأدواتنا.' },
  { title: 'استعد السلات المتروكة', body: 'رسالة واتساب لطيفة بعد ساعة من ترك السلة تستعيد نسبة كبيرة من المبيعات الضائعة. جهّز قالبك من أداة رسائل واتساب.' },
  { title: 'جهّز متجرك للموسم مبكراً', body: 'مواسم الذروة والتخفيضات تصنع فرق مبيعاتك السنوي — خطّط عروضك قبلها بأسابيع لا أيام.' },
  { title: 'سعّر بذكاء لا بالتخمين', body: 'احسب تكلفتك الحقيقية (المنتج + الشحن + الرسوم) قبل تحديد السعر حتى لا تبيع بخسارة. حاسبة الأرباح تفعلها لك بدقة.' },
];

// ── نشرة يومية: نصيحة عملية + أداة مميّزة + تسويق للموقع ولخبراء المنصات ─────────
async function sendDailyTip() {
  // 1) نصيحة اليوم بالذكاء الاصطناعي (توطين سعودي) مع احتياطي
  let tip;
  try {
    const { aiJSON } = require('../ai');
    const out = await aiJSON(
      `أنت خبير في التجارة الإلكترونية. اكتب "نصيحة اليوم" عملية قصيرة لأصحاب المتاجر الإلكترونية (عامة لكل التجار، غير موجّهة لبلد معيّن).
- بأسلوب عربي احترافي واضح ومباشر، بلا عامية ثقيلة.
- عنوان جذّاب (≤ 60 حرفاً) ونص من جملتين إلى ثلاث (≤ 320 حرفاً) قابل للتطبيق فوراً.
- موضوع مختلف كل مرة: تسويق، تسعير، SEO، صور، أوصاف، سلات متروكة، مواسم، ولاء العملاء، الشحن…
أعِد JSON فقط بالشكل: {"title":"...","body":"..."}`,
      { temperature: 0.9, maxTokens: 500 }
    );
    if (out && out.title && out.body) tip = { title: String(out.title).slice(0, 90), body: String(out.body).slice(0, 400) };
  } catch (e) { logger.warn('[newsletter] AI tip failed: ' + e.message); }
  if (!tip) tip = FALLBACK_TIPS[new Date().getDate() % FALLBACK_TIPS.length];

  // 2) أداة اليوم المميّزة (تدور حسب اليوم)
  const tool = FEATURED_TOOLS[Math.floor(Date.now() / 864e5) % FEATURED_TOOLS.length];

  // 3) أحدث مقال (إن وُجد) لإضافة قيمة
  let latest = null;
  try {
    const { rows } = await db.query("SELECT title, slug FROM blog_posts WHERE is_published=true ORDER BY created_at DESC LIMIT 1");
    if (rows.length) latest = rows[0];
  } catch {}

  const { rows: subs } = await db.query('SELECT email, token FROM newsletter_subscribers WHERE is_active=true');
  if (!subs.length) { logger.info('[newsletter] لا مشتركين نشطين'); return { sent: 0 }; }

  const buildHtml = (token) => `
  <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:1.9;color:#1a1a2e;max-width:600px;margin:auto;">
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:22px 24px;border-radius:14px 14px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:1.25rem;">أدوات التاجر · نصيحة اليوم 💡</h1>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #eef2f7;border-top:0;border-radius:0 0 14px 14px;">
      <h2 style="color:#7c3aed;margin:0 0 8px;font-size:1.1rem;">${tip.title}</h2>
      <p style="color:#334155;margin:0 0 20px;">${tip.body}</p>

      <div style="background:#f5f3ff;border-right:4px solid #a855f7;border-radius:10px;padding:16px 18px;margin:0 0 20px;">
        <div style="font-weight:800;color:#6d28d9;margin-bottom:4px;">🛠️ أداة اليوم: ${tool.name}</div>
        <div style="color:#475569;font-size:.95rem;margin-bottom:12px;">${tool.desc}</div>
        <a href="${SITE}${tool.url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:9px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.9rem;">جرّبها مجاناً</a>
      </div>

      ${latest ? `<p style="margin:0 0 20px;">📖 مقال يفيدك اليوم: <a href="${SITE}/pages/blog-post.html?slug=${encodeURIComponent(latest.slug)}" style="color:#7c3aed;font-weight:700;text-decoration:none;">${latest.title}</a></p>` : ''}

      <div style="background:#0f172a;border-radius:12px;padding:18px 20px;margin:0 0 6px;">
        <div style="color:#fff;font-weight:800;margin-bottom:6px;">تبي متجراً احترافياً يبيع من أول يوم؟</div>
        <div style="color:#cbd5e1;font-size:.92rem;margin-bottom:12px;">فريق <strong style="color:#c4b5fd;">خبراء المنصات</strong> يجهّز لك متجر سلة/زد كامل: تصميم وهوية وإعداد احترافي وربط وسائل الدفع والشحن.</div>
        <a href="${SITE}/pages/services.html" style="display:inline-block;background:#a855f7;color:#fff;padding:9px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:.9rem;">اطلب خدمات خبراء المنصات</a>
      </div>
    </div>
    ${brandFooter(token)}
  </div>`;

  let sent = 0;
  for (const s of subs) {
    try { await sendMail({ to: s.email, subject: `💡 ${tip.title} — أدوات التاجر`, html: buildHtml(s.token) }); sent++; }
    catch { /* تابع البقية */ }
    await new Promise(r => setTimeout(r, 400));
  }
  logger.info(`[newsletter] نشرة يومية أُرسلت لـ ${sent}/${subs.length} مشترك — نصيحة: ${tip.title}`);
  return { sent, total: subs.length, tip: tip.title };
}

module.exports = router;
module.exports.sendDigest = sendDigest;
module.exports.sendDailyTip = sendDailyTip;
