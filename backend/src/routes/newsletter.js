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

module.exports = router;
module.exports.sendDigest = sendDigest;
