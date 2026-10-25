// «قيّم مشروعك مع خبير» — التاجر يرسل بيانات مشروعه، يصل الطلب للأدمن بالبريد ويُحفظ في لوحة التحكم
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const logger = require('../logger');
const { optionalAuth, adminAuth } = require('../middleware/auth');
const { sendMail, expertReviewAdminHtml, expertReviewConfirmHtml } = require('../mailer');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.ALERT_EMAIL || process.env.SMTP_USER || '';

const STATUSES = ['new', 'in_progress', 'delivered', 'cancelled'];
const SOCIAL_KEYS = ['instagram', 'tiktok', 'snapchat', 'x', 'other'];
const CHALLENGE_TAGS = [
  'مبيعات ضعيفة', 'زيارات قليلة', 'سلات متروكة', 'تكلفة إعلانات عالية',
  'ضعف المحتوى والتصوير', 'هوية بصرية غير واضحة', 'منافسة قوية', 'التسعير',
  'الشحن والتشغيل', 'ولاء العملاء وتكرار الشراء',
];

// حد لكل IP: يمنع الإغراق دون أن يعيق التاجر الحقيقي
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'أرسلت طلبات كثيرة خلال ساعة. حاول لاحقاً أو تواصل معنا عبر واتساب.' },
});

const normUrl = (v) => {
  const s = String(v || '').trim().slice(0, 500);
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : 'https://' + s.replace(/^\/+/, '');
};

// POST — إرسال طلب تقييم (عام، ويربط بالحساب إن كان مسجّلاً)
router.post(
  '/',
  submitLimiter,
  optionalAuth,
  [
    body('name').trim().isLength({ min: 2, max: 120 }).withMessage('الاسم مطلوب'),
    body('email').trim().isEmail().withMessage('بريد إلكتروني غير صالح').normalizeEmail({ gmail_remove_dots: false }),
    body('phone').trim().matches(/^[+\d][\d\s-]{7,19}$/).withMessage('رقم الجوال غير صالح'),
    body('store_url').trim().isLength({ min: 4, max: 500 }).withMessage('رابط المتجر مطلوب'),
    body('about').trim().isLength({ min: 20, max: 4000 }).withMessage('اكتب نبذة عن مشروعك (20 حرفاً على الأقل)'),
    body('challenges').trim().isLength({ min: 10, max: 4000 }).withMessage('اكتب التحديات التي تواجهك (10 أحرف على الأقل)'),
    body('platform').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
  ],
  async (req, res) => {
    // حقل مخفي للبوتات — نتظاهر بالنجاح دون حفظ
    if (req.body.website) return res.status(201).json({ message: 'تم استلام طلبك', id: 0 });

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, email, phone, about, challenges } = req.body;
    const platform = req.body.platform || null;
    const store_url = normUrl(req.body.store_url);

    const rawSocials = (req.body.socials && typeof req.body.socials === 'object') ? req.body.socials : {};
    const socials = {};
    SOCIAL_KEYS.forEach(k => { const v = String(rawSocials[k] || '').trim().slice(0, 300); if (v) socials[k] = v; });

    const tags = Array.isArray(req.body.challenge_tags)
      ? [...new Set(req.body.challenge_tags.filter(t => CHALLENGE_TAGS.includes(t)))]
      : [];

    let rows;
    try {
      ({ rows } = await db.query(
        `INSERT INTO expert_reviews (user_id, name, email, phone, store_url, platform, socials, about, challenges, challenge_tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at`,
        [req.user?.id || null, name, email, phone, store_url, platform, socials, about, challenges, JSON.stringify(tags)]
      ));
    } catch (e) {
      logger.error('expert-review save failed: ' + e.message);
      return res.status(500).json({ error: 'تعذّر حفظ الطلب، حاول مرة أخرى' });
    }
    const rec = { id: rows[0].id, created_at: rows[0].created_at, name, email, phone, store_url, platform, socials, about, challenges, challenge_tags: tags };
    logger.info(`expert-review #${rec.id}: ${store_url}`);

    if (ADMIN_EMAIL) {
      sendMail({
        to: ADMIN_EMAIL,
        subject: `طلب تقييم مشروع جديد #${rec.id} — ${name}`,
        html: expertReviewAdminHtml(rec),
      }).catch(() => {});
    }
    sendMail({
      to: email,
      subject: 'استلمنا طلب تقييم مشروعك — أدوات التاجر',
      html: expertReviewConfirmHtml(rec),
    }).catch(() => {});

    res.status(201).json({ message: 'تم استلام طلبك بنجاح', id: rec.id });
  }
);

// ─── الأدمن ──────────────────────────────────────────────────────────────────
router.get('/', adminAuth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT r.*, u.name AS user_name
    FROM expert_reviews r LEFT JOIN users u ON r.user_id = u.id
    ORDER BY CASE r.status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, r.created_at DESC
    LIMIT 300
  `);
  res.json(rows);
});

router.put('/:id', adminAuth, async (req, res) => {
  const { status, admin_notes } = req.body;
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة' });
  const { rows } = await db.query(
    `UPDATE expert_reviews
     SET status = COALESCE($1, status),
         admin_notes = CASE WHEN $2::boolean THEN $3 ELSE admin_notes END,
         updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [status || null, admin_notes !== undefined, admin_notes ?? null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'الطلب غير موجود' });
  res.json(rows[0]);
});

router.delete('/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM expert_reviews WHERE id = $1', [req.params.id]);
  res.json({ message: 'تم الحذف' });
});

router.CHALLENGE_TAGS = CHALLENGE_TAGS;
module.exports = router;
