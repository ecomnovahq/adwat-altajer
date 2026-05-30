const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { adminAuth } = require('../middleware/auth');

// Ensure blog_posts table exists
db.query(`
  CREATE TABLE IF NOT EXISTS blog_posts (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    excerpt     TEXT,
    content     TEXT,
    cover_image TEXT,
    category    TEXT DEFAULT 'عام',
    tags        TEXT[] DEFAULT '{}',
    author_name TEXT DEFAULT 'فريق أدوات التاجر',
    is_published BOOLEAN DEFAULT false,
    views       INTEGER DEFAULT 0,
    read_time   INTEGER DEFAULT 3,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => process.stderr.write(`[blog] table init error: ${e.message}\n`));

function slugify(text) {
  return text
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^؀-ۿ\w-]/g, '')
    .toLowerCase()
    .substring(0, 80);
}

// GET published posts (public)
router.get('/', async (req, res) => {
  const { category, search, limit = 12, offset = 0 } = req.query;
  let query = 'SELECT id,title,slug,excerpt,cover_image,category,tags,author_name,read_time,views,created_at FROM blog_posts WHERE is_published=true';
  const params = [];
  if (category && category !== 'all') {
    params.push(category);
    query += ` AND category=$${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    query += ` AND (title ILIKE $${params.length} OR excerpt ILIKE $${params.length})`;
  }
  params.push(parseInt(limit), parseInt(offset));
  query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const { rows } = await db.query(query, params);
  res.json(rows);
});

// GET single post by slug (public) + increment views
router.get('/post/:slug', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM blog_posts WHERE slug=$1 AND is_published=true',
    [req.params.slug]
  );
  if (!rows[0]) return res.status(404).json({ error: 'المقال غير موجود' });
  db.query('UPDATE blog_posts SET views=views+1 WHERE id=$1', [rows[0].id]).catch(() => {});
  res.json(rows[0]);
});

// GET all posts for admin
router.get('/admin/all', adminAuth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM blog_posts ORDER BY created_at DESC');
  res.json(rows);
});

// POST create post (admin)
router.post(
  '/',
  adminAuth,
  [body('title').trim().isLength({ min: 3 }).withMessage('العنوان مطلوب')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { title, excerpt, content, cover_image, category, tags, author_name, is_published, read_time } = req.body;
    let slug = slugify(title);
    const { rows: existing } = await db.query('SELECT id FROM blog_posts WHERE slug=$1', [slug]);
    if (existing.length) slug = slug + '-' + Date.now();

    const { rows } = await db.query(
      `INSERT INTO blog_posts (title,slug,excerpt,content,cover_image,category,tags,author_name,is_published,read_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title, slug, excerpt || null, content || null, cover_image || null,
       category || 'عام', tags || [], author_name || 'فريق أدوات التاجر',
       !!is_published, read_time || 3]
    );
    res.status(201).json(rows[0]);
  }
);

// PUT update post (admin)
router.put('/:id', adminAuth, async (req, res) => {
  const { title, excerpt, content, cover_image, category, tags, author_name, is_published, read_time } = req.body;
  const { rows } = await db.query(
    `UPDATE blog_posts SET title=$1,excerpt=$2,content=$3,cover_image=$4,category=$5,
     tags=$6,author_name=$7,is_published=$8,read_time=$9,updated_at=NOW()
     WHERE id=$10 RETURNING *`,
    [title, excerpt, content, cover_image, category, tags || [], author_name,
     !!is_published, read_time || 3, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'المقال غير موجود' });
  res.json(rows[0]);
});

// DELETE post (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM blog_posts WHERE id=$1', [req.params.id]);
  res.json({ message: 'تم حذف المقال' });
});

module.exports = router;
