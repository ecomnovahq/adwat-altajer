const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const { sendMail, passwordResetHtml, verifyCodeHtml } = require('../mailer');
const logger = require('../logger');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const gen6 = () => String(Math.floor(100000 + Math.random() * 900000));
const SMTP_ON = !!process.env.SMTP_USER;

// تخزين كود تحقق (يلغي أي كود سابق لنفس البريد والغرض)
async function storeCode(email, purpose, payload) {
  const code = gen6();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق
  await db.query('DELETE FROM email_codes WHERE email = $1 AND purpose = $2', [email, purpose]);
  await db.query(
    'INSERT INTO email_codes (email, code, purpose, payload, expires_at) VALUES ($1,$2,$3,$4,$5)',
    [email, code, purpose, payload ? JSON.stringify(payload) : null, expires]
  );
  return code;
}

// ① بدء التسجيل: يتحقق ويرسل كود للبريد (لا يُنشئ الحساب بعد)
router.post(
  '/register-init',
  [
    body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح'),
    body('password').isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    body('name').trim().isLength({ min: 2 }).withMessage('الاسم يجب أن يكون حرفين على الأقل'),
    body('phone').trim().matches(/^[0-9+\-\s]{8,20}$/).withMessage('رقم جوال غير صالح'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, password, name, phone } = req.body;
    try {
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows[0]) return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });

      const hash = await bcrypt.hash(password, 10);
      const code = await storeCode(email, 'verify', { name, phone: phone.trim(), hash });

      const sent = await sendMail({
        to: email,
        subject: 'رمز تفعيل حسابك — أدوات التاجر',
        html: verifyCodeHtml({ name, code, title: 'رمز تفعيل الحساب', intro: 'استخدم هذا الرمز لتفعيل حسابك في أدوات التاجر:' }),
      });

      logger.info(`register-init: code for ${email}${sent ? ' (sent)' : ' (SMTP off)'}`);
      // لو SMTP غير مفعّل، نرجّع الكود للتطوير حتى لا تتعطل التجربة
      res.json({ pending: true, email, ...(SMTP_ON ? {} : { devCode: code }) });
    } catch (err) {
      logger.error('Auth error:', err.message);
      res.status(500).json({ error: 'خطأ في إنشاء الحساب' });
    }
  }
);

// ② تأكيد الكود → إنشاء الحساب
router.post(
  '/verify-email',
  [
    body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح'),
    body('code').trim().isLength({ min: 6, max: 6 }).withMessage('الرمز يجب أن يكون 6 أرقام'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, code } = req.body;
    try {
      const { rows } = await db.query(
        "SELECT * FROM email_codes WHERE email = $1 AND purpose = 'verify' ORDER BY id DESC LIMIT 1",
        [email]
      );
      const rec = rows[0];
      if (!rec || new Date(rec.expires_at) < new Date()) return res.status(400).json({ error: 'انتهت صلاحية الرمز، اطلب رمزاً جديداً' });
      if (rec.attempts >= 6) return res.status(429).json({ error: 'محاولات كثيرة، اطلب رمزاً جديداً' });
      if (String(code).trim() !== rec.code) {
        await db.query('UPDATE email_codes SET attempts = attempts + 1 WHERE id = $1', [rec.id]);
        return res.status(400).json({ error: 'الرمز غير صحيح' });
      }

      // قد يكون أُنشئ الحساب بين الوقتين
      const dup = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (dup.rows[0]) { await db.query('DELETE FROM email_codes WHERE id = $1', [rec.id]); return res.status(409).json({ error: 'البريد مسجل مسبقاً، سجّل الدخول' }); }

      const p = rec.payload || {};
      const { rows: urows } = await db.query(
        'INSERT INTO users (email, password_hash, name, phone) VALUES ($1,$2,$3,$4) RETURNING id, email, name, is_admin, tools_access, phone',
        [email, p.hash, p.name, p.phone || null]
      );
      await db.query('DELETE FROM email_codes WHERE id = $1', [rec.id]);
      const user = urows[0];
      res.status(201).json({ token: signToken(user.id), user });
    } catch (err) {
      logger.error('Auth error:', err.message);
      res.status(500).json({ error: 'خطأ في تأكيد الحساب' });
    }
  }
);

// إعادة إرسال الكود (تسجيل / استعادة)
router.post('/resend-code',
  [body('email').isEmail().normalizeEmail(), body('purpose').isIn(['verify', 'reset'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'بيانات غير صالحة' });
    const { email, purpose } = req.body;
    try {
      const { rows } = await db.query(
        'SELECT * FROM email_codes WHERE email = $1 AND purpose = $2 ORDER BY id DESC LIMIT 1', [email, purpose]
      );
      if (!rows[0]) return res.status(400).json({ error: 'لا يوجد طلب سابق، ابدأ من جديد' });
      const code = await storeCode(email, purpose, rows[0].payload);
      const sent = await sendMail({
        to: email, subject: 'رمز التحقق — أدوات التاجر',
        html: verifyCodeHtml({ code, title: 'رمز التحقق', intro: 'هذا هو رمز التحقق الجديد:' }),
      });
      res.json({ ok: true, ...(SMTP_ON ? {} : { devCode: code }) });
    } catch (err) { res.status(500).json({ error: 'تعذّر إرسال الرمز' }); }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح'),
    body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, password } = req.body;
    try {
      const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      res.json({
        token: signToken(user.id),
        user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin, tools_access: user.tools_access, phone: user.phone },
      });
    } catch (err) {
      logger.error('Auth error:', err.message);
      res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
    }
  }
);

// Me
router.get('/me', auth, (req, res) => res.json({ user: req.user }));

// نبضة الحضور — يستدعيها الفرونت دورياً لتحديث "متصل الآن" بدقة
router.post('/heartbeat', auth, async (req, res) => {
  db.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [req.user.id]).catch(() => {});
  res.json({ ok: true });
});

// نسيت كلمة المرور — يرسل كود 6 أرقام للبريد
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email } = req.body;
    try {
      const { rows } = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);
      if (!rows[0]) {
        // عدم كشف وجود البريد — لكن لا نرسل كوداً
        return res.json({ ok: true, message: 'إذا كان البريد مسجلاً ستصلك رسالة بالرمز.' });
      }
      const code = await storeCode(email, 'reset', null);
      const sent = await sendMail({
        to: email, subject: 'رمز إعادة تعيين كلمة المرور — أدوات التاجر',
        html: verifyCodeHtml({ name: rows[0].name, code, title: 'إعادة تعيين كلمة المرور', intro: 'استخدم هذا الرمز لإعادة تعيين كلمة مرورك:' }),
      });
      logger.info(`forgot-password: code for ${email}${sent ? ' (sent)' : ' (SMTP off)'}`);
      res.json({ ok: true, message: 'إذا كان البريد مسجلاً ستصلك رسالة بالرمز.', ...(SMTP_ON ? {} : { devCode: code }) });
    } catch (err) {
      logger.error('Auth error:', err.message);
      res.status(500).json({ error: 'حدث خطأ، حاول مجدداً' });
    }
  }
);

// إعادة تعيين كلمة المرور — بكود البريد
router.post('/reset-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح'),
    body('code').trim().isLength({ min: 6, max: 6 }).withMessage('الرمز يجب أن يكون 6 أرقام'),
    body('password').isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, code, password } = req.body;
    try {
      const { rows } = await db.query(
        "SELECT * FROM email_codes WHERE email = $1 AND purpose = 'reset' ORDER BY id DESC LIMIT 1", [email]
      );
      const rec = rows[0];
      if (!rec || new Date(rec.expires_at) < new Date()) return res.status(400).json({ error: 'انتهت صلاحية الرمز، اطلب رمزاً جديداً' });
      if (rec.attempts >= 6) return res.status(429).json({ error: 'محاولات كثيرة، اطلب رمزاً جديداً' });
      if (String(code).trim() !== rec.code) {
        await db.query('UPDATE email_codes SET attempts = attempts + 1 WHERE id = $1', [rec.id]);
        return res.status(400).json({ error: 'الرمز غير صحيح' });
      }
      const hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email]);
      await db.query('DELETE FROM email_codes WHERE id = $1', [rec.id]);
      res.json({ message: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' });
    } catch (err) {
      logger.error('Auth error:', err.message);
      res.status(500).json({ error: 'حدث خطأ، حاول مجدداً' });
    }
  }
);

module.exports = router;
