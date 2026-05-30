const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { adminAuth } = require('../middleware/auth');

// GET active reviews (public)
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM reviews WHERE is_active = true ORDER BY created_at DESC'
  );
  res.json(rows);
});

// GET all reviews (admin)
router.get('/admin/all', adminAuth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM reviews ORDER BY created_at DESC');
  res.json(rows);
});

// POST create review (admin)
router.post(
  '/',
  adminAuth,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('الاسم مطلوب'),
    body('review_text').trim().isLength({ min: 10 }).withMessage('نص المراجعة مطلوب'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('التقييم يجب أن يكون من 1 إلى 5'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, store, platform, review_text, rating, avatar_letter } = req.body;
    const letter = avatar_letter || name.charAt(0);
    const { rows } = await db.query(
      `INSERT INTO reviews (name, store, platform, review_text, rating, avatar_letter)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, store || null, platform || null, review_text, parseInt(rating), letter]
    );
    res.status(201).json(rows[0]);
  }
);

// PUT update review (admin)
router.put('/:id', adminAuth, async (req, res) => {
  const { name, store, platform, review_text, rating, avatar_letter, is_active } = req.body;
  const { rows } = await db.query(
    `UPDATE reviews SET name=$1, store=$2, platform=$3, review_text=$4,
     rating=$5, avatar_letter=$6, is_active=$7 WHERE id=$8 RETURNING *`,
    [name, store, platform, review_text, parseInt(rating), avatar_letter, is_active, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'المراجعة غير موجودة' });
  res.json(rows[0]);
});

// DELETE review (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  res.json({ message: 'تم حذف المراجعة' });
});

module.exports = router;
