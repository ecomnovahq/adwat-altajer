const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { adminAuth } = require('../middleware/auth');

// GET active works (public)
router.get('/', async (req, res) => {
  const { category } = req.query;
  let query = 'SELECT * FROM works WHERE is_active = true';
  const params = [];
  if (category && category !== 'all') {
    params.push(category);
    query += ` AND category = $${params.length}`;
  }
  query += ' ORDER BY sort_order ASC, created_at DESC';
  const { rows } = await db.query(query, params);
  res.json(rows);
});

// GET all works (admin)
router.get('/admin/all', adminAuth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM works ORDER BY sort_order ASC, created_at DESC');
  res.json(rows);
});

// POST create work (admin)
router.post(
  '/',
  adminAuth,
  [
    body('title').trim().isLength({ min: 2 }).withMessage('العنوان مطلوب'),
    body('category').notEmpty().withMessage('التصنيف مطلوب'),
    body('badge_label').notEmpty().withMessage('التصنيف المرئي مطلوب'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { title, category, badge_label, description, gradient_from, gradient_via, gradient_to, sort_order } = req.body;
    const { rows } = await db.query(
      `INSERT INTO works (title, category, badge_label, description, gradient_from, gradient_via, gradient_to, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, category, badge_label, description || null, gradient_from || '#0b0e17', gradient_via || '#1e2050', gradient_to || '#6366f1', sort_order || 0]
    );
    res.status(201).json(rows[0]);
  }
);

// PUT update work (admin)
router.put('/:id', adminAuth, async (req, res) => {
  const { title, category, badge_label, description, gradient_from, gradient_via, gradient_to, is_active, sort_order } = req.body;
  const { rows } = await db.query(
    `UPDATE works SET title=$1, category=$2, badge_label=$3, description=$4,
     gradient_from=$5, gradient_via=$6, gradient_to=$7, is_active=$8, sort_order=$9
     WHERE id=$10 RETURNING *`,
    [title, category, badge_label, description, gradient_from, gradient_via, gradient_to, is_active, sort_order, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'العمل غير موجود' });
  res.json(rows[0]);
});

// DELETE work (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM works WHERE id = $1', [req.params.id]);
  res.json({ message: 'تم حذف العمل' });
});

module.exports = router;
