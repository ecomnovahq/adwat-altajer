const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { adminAuth } = require('../middleware/auth');

// GET all active coupons (public)
router.get('/', async (req, res) => {
  const { platform, search } = req.query;
  let query = 'SELECT * FROM coupons WHERE is_active = true';
  const params = [];

  if (platform && platform !== 'all') {
    params.push(platform);
    query += ` AND (platform = $${params.length} OR platform = 'both')`;
  }
  if (search) {
    params.push(`%${search}%`);
    const i = params.length;
    query += ` AND (code ILIKE $${i} OR description ILIKE $${i} OR name ILIKE $${i})`;
  }
  query += ' ORDER BY is_featured DESC, created_at DESC';

  const { rows } = await db.query(query, params);
  res.json(rows);
});

// GET all coupons (admin, includes inactive)
router.get('/admin/all', adminAuth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
  res.json(rows);
});

// POST create coupon (admin)
router.post(
  '/',
  adminAuth,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('اسم الكوبون مطلوب'),
    body('code').trim().isLength({ min: 2 }).withMessage('الكود مطلوب'),
    body('discount').trim().notEmpty().withMessage('نسبة الخصم مطلوبة'),
    body('platform').isIn(['salla', 'zid', 'both']).withMessage('المنصة غير صالحة'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, code, discount, platform, description, link, expiry_date, category, is_featured } = req.body;
    const { rows } = await db.query(
      `INSERT INTO coupons (name, code, discount, platform, description, link, expiry_date, category, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, code.toUpperCase(), discount, platform, description || null, link || null, expiry_date || null, category || 'عام', is_featured || false]
    );
    res.status(201).json(rows[0]);
  }
);

// PUT update coupon (admin)
router.put('/:id', adminAuth, async (req, res) => {
  const { name, code, discount, platform, description, link, expiry_date, category, is_active, is_featured } = req.body;
  const { rows } = await db.query(
    `UPDATE coupons SET name=$1, code=$2, discount=$3, platform=$4, description=$5, link=$6,
     expiry_date=$7, category=$8, is_active=$9, is_featured=$10, updated_at=NOW()
     WHERE id=$11 RETURNING *`,
    [name, code?.toUpperCase(), discount, platform, description, link, expiry_date || null, category, is_active, is_featured, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'الكوبون غير موجود' });
  res.json(rows[0]);
});

// DELETE coupon (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
  res.json({ message: 'تم حذف الكوبون' });
});

module.exports = router;
