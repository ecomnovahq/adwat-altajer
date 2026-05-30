const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, adminAuth, optionalAuth } = require('../middleware/auth');
const { sendMail, bookingConfirmationHtml } = require('../mailer');

// POST create booking (public)
router.post(
  '/',
  optionalAuth,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('الاسم مطلوب'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail().withMessage('بريد إلكتروني غير صالح'),
    body('phone').trim().notEmpty().withMessage('رقم الجوال مطلوب'),
    body('service_type').notEmpty().withMessage('نوع الخدمة مطلوب'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, email, phone, service_type, message } = req.body;
    const { rows } = await db.query(
      'INSERT INTO bookings (user_id, name, email, phone, service_type, message) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [req.user?.id || null, name, email, phone, service_type, message || null]
    );
    const booking = rows[0];

    if (email) {
      sendMail({
        to: email,
        subject: 'تم استلام طلبك — أدوات التاجر',
        html: bookingConfirmationHtml({ name, service_type, id: booking.id }),
      });
    }

    res.status(201).json({ message: 'تم إرسال طلبك بنجاح! سنتواصل معك خلال 24 ساعة.', id: booking.id });
  }
);

// GET my bookings (user)
router.get('/my', auth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, service_type, status, message, created_at FROM bookings WHERE user_id=$1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

// GET all bookings (admin)
router.get('/', adminAuth, async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT b.*, u.name as user_name FROM bookings b LEFT JOIN users u ON b.user_id = u.id';
  const params = [];
  if (status && status !== 'all') { params.push(status); query += ' WHERE b.status = $1'; }
  query += ' ORDER BY b.created_at DESC';
  const { rows } = await db.query(query, params);
  res.json(rows);
});

// PUT update booking status (admin)
router.put('/:id', adminAuth, async (req, res) => {
  const { status, notes } = req.body;
  const valid = ['pending', 'contacted', 'in_progress', 'completed', 'cancelled'];
  if (status && !valid.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة' });

  const { rows } = await db.query(
    'UPDATE bookings SET status=COALESCE($1,status), notes=COALESCE($2,notes), updated_at=NOW() WHERE id=$3 RETURNING *',
    [status || null, notes || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'الحجز غير موجود' });
  res.json(rows[0]);
});

// DELETE booking (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
  res.json({ message: 'تم حذف الحجز' });
});

module.exports = router;
