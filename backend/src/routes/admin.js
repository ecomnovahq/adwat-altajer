const router = require('express').Router();
const db = require('../config/db');
const { adminAuth } = require('../middleware/auth');

// Dashboard stats
router.get('/dashboard', adminAuth, async (req, res) => {
  const [users, totalBookings, pendingBookings, coupons, works, reviews, toolLogs] = await Promise.all([
    db.query("SELECT COUNT(*) FROM users WHERE is_admin = false"),
    db.query("SELECT COUNT(*) FROM bookings"),
    db.query("SELECT COUNT(*) FROM bookings WHERE status = 'pending'"),
    db.query("SELECT COUNT(*) FROM coupons WHERE is_active = true"),
    db.query("SELECT COUNT(*) FROM works WHERE is_active = true"),
    db.query("SELECT COUNT(*) FROM reviews WHERE is_active = true"),
    db.query("SELECT COUNT(*) FROM tool_logs WHERE created_at > NOW() - INTERVAL '30 days'"),
  ]);

  const recentBookings = await db.query(
    'SELECT * FROM bookings ORDER BY created_at DESC LIMIT 8'
  );

  const toolStats = await db.query(
    `SELECT tool_name, COUNT(*) as count FROM tool_logs
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY tool_name`
  );

  res.json({
    stats: {
      users: parseInt(users.rows[0].count),
      totalBookings: parseInt(totalBookings.rows[0].count),
      pendingBookings: parseInt(pendingBookings.rows[0].count),
      coupons: parseInt(coupons.rows[0].count),
      works: parseInt(works.rows[0].count),
      reviews: parseInt(reviews.rows[0].count),
      toolUsage30d: parseInt(toolLogs.rows[0].count),
    },
    recentBookings: recentBookings.rows,
    toolStats: toolStats.rows,
  });
});

// All users
router.get('/users', adminAuth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, email, name, is_admin, tools_access, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(rows);
});

// Update user tools access
router.put('/users/:id/tools-access', adminAuth, async (req, res) => {
  const { tools_access } = req.body;
  if (typeof tools_access !== 'object') return res.status(400).json({ error: 'بيانات غير صالحة' });
  const { rows } = await db.query(
    'UPDATE users SET tools_access = $1 WHERE id = $2 RETURNING id, email, name, tools_access',
    [JSON.stringify(tools_access), req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json(rows[0]);
});

// Toggle admin status
router.put('/users/:id/toggle-admin', adminAuth, async (req, res) => {
  const { rows } = await db.query(
    'UPDATE users SET is_admin = NOT is_admin WHERE id = $1 RETURNING id, email, name, is_admin',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json(rows[0]);
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
  await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'تم حذف المستخدم' });
});

// ─── Tool Settings ────────────────────────────────────────────────────────────
router.get('/tool-settings', adminAuth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM tool_settings ORDER BY tool_name');
  res.json(rows);
});

router.put('/tool-settings/:toolName', adminAuth, async (req, res) => {
  const { is_paid, daily_free_limit } = req.body;
  const { rows } = await db.query(
    `UPDATE tool_settings SET is_paid=$1, daily_free_limit=$2, updated_at=NOW() WHERE tool_name=$3 RETURNING *`,
    [!!is_paid, daily_free_limit || null, req.params.toolName]
  );
  if (!rows[0]) return res.status(404).json({ error: 'الأداة غير موجودة' });
  res.json(rows[0]);
});

// ─── Tool Access Requests ─────────────────────────────────────────────────────
router.get('/tool-requests', adminAuth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT r.*, u.name AS user_name, u.email AS user_email
    FROM tool_access_requests r JOIN users u ON r.user_id=u.id
    ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at DESC
  `);
  res.json(rows);
});

router.put('/tool-requests/:id', adminAuth, async (req, res) => {
  const { status, admin_note } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ error: 'حالة غير صالحة' });

  const { rows } = await db.query(
    `UPDATE tool_access_requests SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
    [status, admin_note || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'الطلب غير موجود' });

  if (status === 'approved') {
    const r = rows[0];
    await db.query(
      `UPDATE users SET tools_access = COALESCE(tools_access,'{}')::jsonb || $1 WHERE id=$2`,
      [JSON.stringify({ [r.tool_name]: true }), r.user_id]
    );
  }
  res.json(rows[0]);
});

// Tool logs
router.get('/logs', adminAuth, async (req, res) => {
  const { tool, limit = 50 } = req.query;
  let query = `SELECT l.*, u.email as user_email FROM tool_logs l
               LEFT JOIN users u ON l.user_id = u.id`;
  const params = [];
  if (tool) { params.push(tool); query += ` WHERE l.tool_name = $${params.length}`; }
  params.push(Math.min(parseInt(limit), 200));
  query += ` ORDER BY l.created_at DESC LIMIT $${params.length}`;
  const { rows } = await db.query(query, params);
  res.json(rows);
});

module.exports = router;
