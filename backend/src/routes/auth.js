const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const { sendMail, passwordResetHtml } = require('../mailer');
const logger = require('../logger');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح'),
    body('password').isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    body('name').trim().isLength({ min: 2 }).withMessage('الاسم يجب أن يكون حرفين على الأقل'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, password, name } = req.body;
    try {
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows[0]) return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });

      const hash = await bcrypt.hash(password, 10);
      const { rows } = await db.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, is_admin, tools_access',
        [email, hash, name]
      );

      const user = rows[0];
      res.status(201).json({ token: signToken(user.id), user });
    } catch (err) {
      logger.error('Auth error:', err.message);
      res.status(500).json({ error: 'خطأ في إنشاء الحساب' });
    }
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
        user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin, tools_access: user.tools_access },
      });
    } catch (err) {
      logger.error('Auth error:', err.message);
      res.status(500).json({ error: 'خطأ في تسجيل الدخول' });
    }
  }
);

// Me
router.get('/me', auth, (req, res) => res.json({ user: req.user }));

// Forgot password — sends reset link
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email } = req.body;
    try {
      const { rows } = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);
      // Always respond 200 to prevent email enumeration
      if (!rows[0]) return res.json({ message: 'إذا كان البريد مسجلاً، ستصلك رسالة إعادة التعيين.' });

      const user = rows[0];
      const token = crypto.randomBytes(48).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
        [user.id, token, expires]
      );

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5500'}/pages/reset-password.html?token=${token}`;
      sendMail({
        to: email,
        subject: 'إعادة تعيين كلمة المرور — أدوات التاجر',
        html: passwordResetHtml({ name: user.name, resetUrl }),
      });

      res.json({ message: 'إذا كان البريد مسجلاً، ستصلك رسالة إعادة التعيين.' });
    } catch (err) {
      logger.error('Auth error:', err.message);
      res.status(500).json({ error: 'حدث خطأ، حاول مجدداً' });
    }
  }
);

// Reset password — validates token and sets new password
router.post('/reset-password',
  [
    body('token').notEmpty().withMessage('الرمز مطلوب'),
    body('password').isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { token, password } = req.body;
    try {
      const { rows } = await db.query(
        `SELECT prt.id, prt.user_id FROM password_reset_tokens prt
         WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
        [token]
      );
      if (!rows[0]) return res.status(400).json({ error: 'الرابط غير صالح أو منتهي الصلاحية' });

      const { id: tokenId, user_id } = rows[0];
      const hash = await bcrypt.hash(password, 10);

      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user_id]);
      await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]);

      res.json({ message: 'تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.' });
    } catch (err) {
      logger.error('Auth error:', err.message);
      res.status(500).json({ error: 'حدث خطأ، حاول مجدداً' });
    }
  }
);

module.exports = router;
