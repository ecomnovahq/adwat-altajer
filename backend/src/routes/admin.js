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

// إحصائيات كاملة بنطاق زمني (from/to) — لوحة تحليلات الأدمن
router.get('/stats/full', adminAuth, async (req, res) => {
  // نطاق التاريخ: افتراضي آخر 30 يوماً
  const toDate = req.query.to ? new Date(req.query.to) : new Date();
  const fromDate = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 864e5);
  if (isNaN(fromDate) || isNaN(toDate)) return res.status(400).json({ error: 'تاريخ غير صالح' });
  // اجعل "إلى" نهاية اليوم
  toDate.setHours(23, 59, 59, 999);
  const range = [fromDate.toISOString(), toDate.toISOString()];

  const onlineWindow = parseInt(req.query.onlineMins) || 3; // دقائق اعتبار المستخدم "متصل الآن"

  const [
    online, activeUsers, newUsers, totalUsers, totalAdmins,
    totalRuns, toolUsage, dailyUsage, topUsers, recentActive,
  ] = await Promise.all([
    db.query(`SELECT COUNT(*) FROM users WHERE last_seen > NOW() - INTERVAL '${onlineWindow} minutes'`),
    db.query('SELECT COUNT(DISTINCT user_id) FROM tool_logs WHERE created_at BETWEEN $1 AND $2', range),
    db.query('SELECT COUNT(*) FROM users WHERE created_at BETWEEN $1 AND $2', range),
    db.query('SELECT COUNT(*) FROM users WHERE is_admin = false'),
    db.query('SELECT COUNT(*) FROM users WHERE is_admin = true'),
    db.query('SELECT COUNT(*) FROM tool_logs WHERE created_at BETWEEN $1 AND $2', range),
    db.query(`SELECT tool_name, COUNT(*)::int AS count FROM tool_logs
              WHERE created_at BETWEEN $1 AND $2 GROUP BY tool_name ORDER BY count DESC`, range),
    db.query(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
              FROM tool_logs WHERE created_at BETWEEN $1 AND $2
              GROUP BY day ORDER BY day`, range),
    db.query(`SELECT u.id, u.name, u.email, COUNT(t.*)::int AS runs
              FROM tool_logs t JOIN users u ON u.id = t.user_id
              WHERE t.created_at BETWEEN $1 AND $2
              GROUP BY u.id, u.name, u.email ORDER BY runs DESC LIMIT 8`, range),
    db.query(`SELECT id, name, email, last_seen FROM users
              WHERE last_seen IS NOT NULL ORDER BY last_seen DESC LIMIT 8`),
  ]);

  res.json({
    range: { from: fromDate.toISOString(), to: toDate.toISOString() },
    onlineWindow,
    online: parseInt(online.rows[0].count),
    activeUsers: parseInt(activeUsers.rows[0].count),
    newUsers: parseInt(newUsers.rows[0].count),
    totalUsers: parseInt(totalUsers.rows[0].count),
    totalAdmins: parseInt(totalAdmins.rows[0].count),
    totalRuns: parseInt(totalRuns.rows[0].count),
    toolUsage: toolUsage.rows,
    dailyUsage: dailyUsage.rows,
    topUsers: topUsers.rows,
    recentActive: recentActive.rows,
  });
});

// طلبات تحليل المتاجر — مع بيانات العميل
router.get('/analyses', adminAuth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT a.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
    FROM analysis_submissions a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC LIMIT 300`);
  res.json(rows);
});
router.put('/analyses/:id', adminAuth, async (req, res) => {
  const status = ['new', 'handled'].includes(req.body.status) ? req.body.status : 'handled';
  const { rows } = await db.query('UPDATE analysis_submissions SET status=$1 WHERE id=$2 RETURNING id', [status, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'غير موجود' });
  res.json({ ok: true });
});
router.delete('/analyses/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM analysis_submissions WHERE id=$1', [req.params.id]);
  res.json({ message: 'تم الحذف' });
});

// مساعد التاجر — عملاء الأداة (مجمّعين حسب العميل) — قسم مستقل في لوحة التحكم
router.get('/assistant-clients', adminAuth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT u.id AS user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
           COALESCE(u.max_stores,1) AS max_stores, COALESCE(u.ai_quota,300) AS ai_quota,
           COUNT(s.id)::int AS stores_count,
           COALESCE(SUM((SELECT COUNT(*) FROM store_products p WHERE p.store_id=s.id)),0)::int AS products_total,
           COALESCE(ROUND(AVG(s.latest_score)),0)::int AS avg_score,
           COALESCE(SUM((SELECT COUNT(*) FROM store_alerts a WHERE a.store_id=s.id AND a.seen=false)),0)::int AS open_alerts,
           MAX(s.last_synced_at) AS last_synced_at,
           (SELECT COUNT(*) FROM tool_logs tl WHERE tl.user_id=u.id AND tl.tool_name='assistant'
              AND tl.created_at >= date_trunc('month', now())
              AND (tl.input_data->>'action') IN ('gen_description','gen_seo','gen_bullets','gen_campaign','fix_gaps','bulk_description','bulk_seo'))::int AS ai_used
    FROM users u JOIN merchant_stores s ON s.user_id=u.id
    GROUP BY u.id, u.name, u.email, u.phone, u.max_stores, u.ai_quota
    ORDER BY MAX(s.last_synced_at) DESC NULLS LAST LIMIT 300`);
  res.json(rows);
});
// تفاصيل عميل: كل متاجره + إحصاءاتها
router.get('/assistant-clients/:userId', adminAuth, async (req, res) => {
  const u = (await db.query('SELECT id,name,email,phone,COALESCE(max_stores,1) AS max_stores FROM users WHERE id=$1', [req.params.userId])).rows[0];
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  const stores = (await db.query(`
    SELECT s.id, s.store_url, s.store_name, s.platform, s.latest_score, s.product_limit, s.last_synced_at,
           (SELECT COUNT(*)::int FROM store_products p WHERE p.store_id=s.id) AS products_saved
    FROM merchant_stores s WHERE s.user_id=$1 ORDER BY s.id ASC`, [req.params.userId])).rows;
  res.json({ user: u, stores });
});
// تعديل الحد الأقصى لعدد متاجر العميل
router.put('/assistant-clients/:userId/max-stores', adminAuth, async (req, res) => {
  const max = Math.max(1, Math.min(50, parseInt(req.body.maxStores) || 1));
  const { rows } = await db.query('UPDATE users SET max_stores=$1 WHERE id=$2 RETURNING id', [max, req.params.userId]);
  if (!rows[0]) return res.status(404).json({ error: 'غير موجود' });
  res.json({ ok: true, maxStores: max });
});
// تطبيق باقة جاهزة: تضبط عدد المتاجر + حدّ المنتجات لكل متاجر العميل دفعة واحدة
const ASSISTANT_PLANS = {
  basic:   { maxStores: 1,  productLimit: 200,  aiQuota: 150,  label: 'تاجر' },
  pro:     { maxStores: 3,  productLimit: 500,  aiQuota: 600,  label: 'احترافي' },
  premium: { maxStores: 10, productLimit: 1000, aiQuota: 2000, label: 'متجر كبير' },
};
router.put('/assistant-clients/:userId/plan', adminAuth, async (req, res) => {
  const plan = ASSISTANT_PLANS[req.body.plan];
  if (!plan) return res.status(400).json({ error: 'باقة غير معروفة' });
  const u = (await db.query('UPDATE users SET max_stores=$1, ai_quota=$2 WHERE id=$3 RETURNING id', [plan.maxStores, plan.aiQuota, req.params.userId])).rows[0];
  if (!u) return res.status(404).json({ error: 'غير موجود' });
  await db.query('UPDATE merchant_stores SET product_limit=$1 WHERE user_id=$2', [plan.productLimit, req.params.userId]);
  res.json({ ok: true, ...plan });
});
// تعديل حدّ الذكاء الشهري للعميل
router.put('/assistant-clients/:userId/ai-quota', adminAuth, async (req, res) => {
  const q = Math.max(0, Math.min(100000, parseInt(req.body.aiQuota) || 0));
  const { rows } = await db.query('UPDATE users SET ai_quota=$1 WHERE id=$2 RETURNING id', [q, req.params.userId]);
  if (!rows[0]) return res.status(404).json({ error: 'غير موجود' });
  res.json({ ok: true, aiQuota: q });
});

// مساعد التاجر — متاجر العملاء المحفوظة (نظرة عامة للأدمن)
router.put('/assistant-stores/:id/limit', adminAuth, async (req, res) => {
  const allowed = [100, 200, 300, 500, 1000];
  const limit = allowed.includes(parseInt(req.body.limit)) ? parseInt(req.body.limit) : 100;
  const { rows } = await db.query('UPDATE merchant_stores SET product_limit=$1 WHERE id=$2 RETURNING id', [limit, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'غير موجود' });
  res.json({ ok: true, limit });
});
router.get('/assistant-stores', adminAuth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT s.id, s.store_url, s.store_name, s.platform, s.latest_score, s.latest_report, s.product_limit, s.last_synced_at, s.created_at,
           u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
           (SELECT COUNT(*)::int FROM store_products p WHERE p.store_id=s.id) AS products_saved,
           (SELECT COUNT(*)::int FROM store_alerts a WHERE a.store_id=s.id AND a.seen=false) AS open_alerts
    FROM merchant_stores s LEFT JOIN users u ON u.id=s.user_id
    ORDER BY s.last_synced_at DESC NULLS LAST LIMIT 300`);
  res.json(rows);
});
router.get('/assistant-stores/:id', adminAuth, async (req, res) => {
  const s = (await db.query(`SELECT s.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
    FROM merchant_stores s LEFT JOIN users u ON u.id=s.user_id WHERE s.id=$1`, [req.params.id])).rows[0];
  if (!s) return res.status(404).json({ error: 'غير موجود' });
  const products = (await db.query('SELECT name,price,currency,image,has_description FROM store_products WHERE store_id=$1 LIMIT 200', [req.params.id])).rows;
  const alerts = (await db.query('SELECT type,severity,message,created_at FROM store_alerts WHERE store_id=$1 ORDER BY created_at DESC LIMIT 50', [req.params.id])).rows;
  const chats = (await db.query('SELECT role,content,created_at FROM assistant_chats WHERE store_id=$1 ORDER BY id ASC LIMIT 200', [req.params.id])).rows;
  const insights = (await db.query('SELECT id,kind,title,body,pinned,created_at FROM store_admin_insights WHERE store_id=$1 ORDER BY pinned DESC, created_at DESC', [req.params.id])).rows;
  res.json({ store: s, products, alerts, chats, insights });
});

// ─── تحليل الخبير البشري لكل متجر (يُغذّي لوحة العميل + المساعد الذكي) ────────
router.get('/assistant-stores/:id/insights', adminAuth, async (req, res) => {
  const rows = (await db.query('SELECT id,kind,title,body,pinned,created_at FROM store_admin_insights WHERE store_id=$1 ORDER BY pinned DESC, created_at DESC', [req.params.id])).rows;
  res.json(rows);
});
router.post('/assistant-stores/:id/insights', adminAuth, async (req, res) => {
  const kind = ['insight', 'recommendation', 'warning', 'opportunity'].includes(req.body.kind) ? req.body.kind : 'insight';
  const title = String(req.body.title || '').trim().slice(0, 250);
  const body = String(req.body.body || '').trim().slice(0, 5000);
  const pinned = !!req.body.pinned;
  if (!body) return res.status(400).json({ error: 'النص مطلوب' });
  const row = (await db.query(
    'INSERT INTO store_admin_insights (store_id,kind,title,body,pinned,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,kind,title,body,pinned,created_at',
    [req.params.id, kind, title, body, pinned, req.user.id]
  )).rows[0];
  res.json({ ok: true, insight: row });
});
router.delete('/insights/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM store_admin_insights WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// All users
router.get('/users', adminAuth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, email, name, is_admin, tools_access, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(rows);
});

// تفاصيل مستخدم واحد — بياناته + الاستخدام + السجل
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const u = (await db.query(
      `SELECT id, email, name, phone, is_admin, tools_access, created_at, last_seen,
              (password_hash IS NOT NULL AND password_hash <> '') AS has_password
         FROM users WHERE id = $1`, [id])).rows[0];
    if (!u) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const usage = (await db.query(
      `SELECT tool_name, COUNT(*)::int AS count, MAX(created_at) AS last_used
         FROM tool_logs WHERE user_id = $1 GROUP BY tool_name ORDER BY count DESC`, [id])).rows;
    const totalRuns = usage.reduce((s, r) => s + r.count, 0);
    const history = (await db.query(
      `SELECT id, tool_name, input_data, created_at
         FROM tool_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [id])).rows;
    const analyses = (await db.query(
      `SELECT id, store_url, store_name, score, created_at
         FROM analysis_submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [id])).rows;

    res.json({ ...u, usage, totalRuns, history, analyses });
  } catch (err) {
    console.error('user detail error:', err.message);
    res.status(500).json({ error: 'تعذّر جلب تفاصيل المستخدم' });
  }
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
  const { rows } = await db.query('SELECT * FROM tool_settings ORDER BY sort_order ASC, tool_name');
  res.json(rows);
});

router.put('/tool-settings/:toolName', adminAuth, async (req, res) => {
  const { is_paid, daily_free_limit, status, display_name, price, badge, features } = req.body;
  const allowedStatus = ['active', 'hidden', 'coming_soon'];
  const newStatus = allowedStatus.includes(status) ? status : null;
  const priceVal = (price === '' || price == null || isNaN(parseFloat(price))) ? null : parseFloat(price);
  const featuresVal = Array.isArray(features) ? JSON.stringify(features.filter(Boolean).map(x => String(x).slice(0, 160)).slice(0, 20)) : null;
  const { rows } = await db.query(
    `UPDATE tool_settings SET
       is_paid=$1,
       daily_free_limit=$2,
       status=COALESCE($3, status),
       display_name=COALESCE($4, display_name),
       price=$5,
       badge=$6,
       features=COALESCE($7, features),
       updated_at=NOW()
     WHERE tool_name=$8 RETURNING *`,
    [!!is_paid, daily_free_limit || null, newStatus, display_name || null, priceVal, (badge || '').slice(0, 40) || null, featuresVal, req.params.toolName]
  );
  if (!rows[0]) return res.status(404).json({ error: 'الأداة غير موجودة' });
  res.json(rows[0]);
});

// ─── باقات الاشتراك (CRUD) ───
router.get('/plans', adminAuth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM plans ORDER BY sort_order ASC, id ASC');
  res.json(rows);
});
function planBody(b) {
  return {
    name: String(b.name || '').slice(0, 120),
    price: (b.price === '' || b.price == null || isNaN(parseFloat(b.price))) ? null : parseFloat(b.price),
    period: String(b.period || 'شهرياً').slice(0, 30),
    badge: (String(b.badge || '').slice(0, 40)) || null,
    features: Array.isArray(b.features) ? JSON.stringify(b.features.filter(Boolean).map(x => String(x).slice(0, 160)).slice(0, 30)) : '[]',
    tools: Array.isArray(b.tools) ? JSON.stringify(b.tools.map(String).slice(0, 50)) : '[]',
    sort_order: parseInt(b.sort_order) || 100,
    active: b.active !== false && b.active !== 'false',
  };
}
router.post('/plans', adminAuth, async (req, res) => {
  const p = planBody(req.body);
  if (!p.name) return res.status(400).json({ error: 'أدخل اسم الباقة' });
  const { rows } = await db.query(
    `INSERT INTO plans (name,price,period,badge,features,tools,sort_order,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [p.name, p.price, p.period, p.badge, p.features, p.tools, p.sort_order, p.active]);
  res.status(201).json(rows[0]);
});
router.put('/plans/:id', adminAuth, async (req, res) => {
  const p = planBody(req.body);
  if (!p.name) return res.status(400).json({ error: 'أدخل اسم الباقة' });
  const { rows } = await db.query(
    `UPDATE plans SET name=$1,price=$2,period=$3,badge=$4,features=$5,tools=$6,sort_order=$7,active=$8 WHERE id=$9 RETURNING *`,
    [p.name, p.price, p.period, p.badge, p.features, p.tools, p.sort_order, p.active, req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'الباقة غير موجودة' });
  res.json(rows[0]);
});
router.delete('/plans/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM plans WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ترتيب عرض الأدوات — يستقبل مصفوفة بأسماء الأدوات بالترتيب المطلوب
router.put('/tool-order', adminAuth, async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order) || !order.length) return res.status(400).json({ error: 'ترتيب غير صالح' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < order.length; i++) {
      await client.query('UPDATE tool_settings SET sort_order=$1, updated_at=NOW() WHERE tool_name=$2',
        [i + 1, String(order[i])]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'تعذّر حفظ الترتيب' });
  } finally {
    client.release();
  }
  res.json({ message: 'تم حفظ الترتيب' });
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

// ─── Merchant Path Submissions ────────────────────────────────────────────────
router.get('/merchant-path', adminAuth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT s.*, u.name AS user_name, u.email AS user_email
    FROM merchant_path_submissions s LEFT JOIN users u ON s.user_id = u.id
    ORDER BY CASE s.status WHEN 'new' THEN 0 ELSE 1 END, s.created_at DESC
    LIMIT 200
  `);
  res.json(rows);
});

router.put('/merchant-path/:id', adminAuth, async (req, res) => {
  const { status } = req.body;
  if (!['new', 'handled'].includes(status)) return res.status(400).json({ error: 'حالة غير صالحة' });
  const { rows } = await db.query(
    'UPDATE merchant_path_submissions SET status=$1 WHERE id=$2 RETURNING id, status',
    [status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'الطلب غير موجود' });
  res.json(rows[0]);
});

router.delete('/merchant-path/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM merchant_path_submissions WHERE id=$1', [req.params.id]);
  res.json({ message: 'تم الحذف' });
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
