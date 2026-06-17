const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, adminAuth } = require('../middleware/auth');

const { sendMail } = require('../mailer');
const TKT = (id) => 'TKT-' + (1000 + Number(id)); // رقم التذكرة المعروض

// تنظيف المرفقات: مصفوفة {name,type,url} حيث url هو data: URL — مع حدود حجم وعدد
function cleanAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 5).map(a => {
    const url = String(a && a.url || '');
    if (!/^data:[\w.+/-]+;base64,/.test(url)) return null;
    if (url.length > 7_000_000) return null; // ~5MB لكل ملف
    return { name: String(a.name || 'ملف').slice(0, 120), type: String(a.type || '').slice(0, 80), url };
  }).filter(Boolean);
}
const attJson = att => att.length ? JSON.stringify(att) : null;

// ─── المستخدم ─────────────────────────────────────────────────────────────────

// فتح تذكرة جديدة (مع رسالة أولى اختيارية)
router.post('/', auth,
  [body('topic').trim().isLength({ min: 1, max: 120 }).withMessage('اختر موضوع التذكرة')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const topic = String(req.body.topic).trim().slice(0, 120);
    const firstMsg = String(req.body.message || '').trim().slice(0, 2000);
    const att = cleanAttachments(req.body.attachments);
    const isVip = req.body.vip === true || req.body.vip === 'true';
    const { rows } = await db.query(
      'INSERT INTO support_tickets (user_id, topic, is_vip) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, topic, isVip]
    );
    const ticket = rows[0];
    if (firstMsg || att.length) {
      await db.query('INSERT INTO support_messages (ticket_id, sender, body, attachments) VALUES ($1,$2,$3,$4)',
        [ticket.id, 'user', firstMsg || '(مرفق)', attJson(att)]);
    }
    res.status(201).json({ ...ticket, number: TKT(ticket.id) });
  }
);

// تذاكر المستخدم الحالي
router.get('/', auth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT t.*, (SELECT body FROM support_messages m WHERE m.ticket_id=t.id ORDER BY id DESC LIMIT 1) AS last_message
     FROM support_tickets t WHERE user_id=$1 ORDER BY updated_at DESC`,
    [req.user.id]
  );
  res.json(rows.map(t => ({ ...t, number: TKT(t.id) })));
});

// رسائل تذكرة (للمالك أو الأدمن) — يدعم since لجلب الجديد فقط
router.get('/:id/messages', auth, async (req, res) => {
  const tk = await db.query('SELECT * FROM support_tickets WHERE id=$1', [req.params.id]);
  if (!tk.rows[0]) return res.status(404).json({ error: 'التذكرة غير موجودة' });
  if (!req.user.is_admin && tk.rows[0].user_id !== req.user.id)
    return res.status(403).json({ error: 'غير مصرح' });
  const since = parseInt(req.query.since) || 0;
  const { rows } = await db.query(
    'SELECT id, sender, body, attachments, created_at FROM support_messages WHERE ticket_id=$1 AND id>$2 ORDER BY id',
    [req.params.id, since]
  );
  res.json({ ticket: { ...tk.rows[0], number: TKT(tk.rows[0].id) }, messages: rows });
});

// إرسال رسالة (المستخدم المالك) — يدعم نص و/أو مرفقات
router.post('/:id/messages', auth, async (req, res) => {
    const att = cleanAttachments(req.body.attachments);
    const text = String(req.body.body || '').trim().slice(0, 2000);
    if (!text && !att.length) return res.status(400).json({ error: 'الرسالة فارغة' });
    const tk = await db.query('SELECT * FROM support_tickets WHERE id=$1', [req.params.id]);
    if (!tk.rows[0]) return res.status(404).json({ error: 'التذكرة غير موجودة' });
    if (tk.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'غير مصرح' });
    const { rows } = await db.query(
      'INSERT INTO support_messages (ticket_id, sender, body, attachments) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, 'user', text || '(مرفق)', attJson(att)]
    );
    await db.query("UPDATE support_tickets SET status='open', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.status(201).json(rows[0]);
  }
);

// ─── الأدمن ───────────────────────────────────────────────────────────────────

// كل التذاكر مع بيانات المستخدم وعدّاد رسائل العميل غير المردود عليها
router.get('/admin/all', adminAuth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT t.*, u.name AS user_name, u.email AS user_email,
      (SELECT body FROM support_messages m WHERE m.ticket_id=t.id ORDER BY id DESC LIMIT 1) AS last_message,
      (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id=t.id) AS msg_count
    FROM support_tickets t JOIN users u ON u.id=t.user_id
    ORDER BY t.updated_at DESC`);
  res.json(rows.map(t => ({ ...t, number: TKT(t.id) })));
});

// رد الأدمن
router.post('/:id/admin-reply', adminAuth,
  async (req, res) => {
    const att = cleanAttachments(req.body.attachments);
    const reply = String(req.body.body || '').trim().slice(0, 2000);
    if (!reply && !att.length) return res.status(400).json({ error: 'الرسالة فارغة' });
    const tk = await db.query(
      `SELECT t.id, t.topic, u.name AS user_name, u.email AS user_email
         FROM support_tickets t JOIN users u ON u.id=t.user_id WHERE t.id=$1`, [req.params.id]);
    if (!tk.rows[0]) return res.status(404).json({ error: 'التذكرة غير موجودة' });
    const { rows } = await db.query(
      'INSERT INTO support_messages (ticket_id, sender, body, attachments) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, 'admin', reply || '(مرفق)', attJson(att)]
    );
    await db.query("UPDATE support_tickets SET status='answered', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.status(201).json(rows[0]);

    // إشعار بريدي للعميل (لا يعطّل الرد إن فشل الإرسال)
    const t = tk.rows[0];
    if (t.user_email) {
      const html = `<div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:1.9;color:#1a1a2e;">
        <h2 style="color:#6d28d9;">رد جديد على تذكرتك ${TKT(t.id)}</h2>
        <p>مرحباً ${t.user_name || ''}، وصلك رد من فريق خبراء المنصات بخصوص: <b>${t.topic || ''}</b></p>
        <blockquote style="background:#f7f5ff;border-right:3px solid #6d28d9;padding:12px 16px;border-radius:8px;">${reply.replace(/</g,'&lt;')}</blockquote>
        <p>ادخل حسابك في «رسائلي» للرد ومتابعة المحادثة.</p>
      </div>`;
      sendMail({ to: t.user_email, subject: `رد على تذكرتك ${TKT(t.id)} — أدوات التاجر`, html }).catch(() => {});
    }
  }
);

// تغيير حالة التذكرة (open | answered | closed)
router.put('/:id/status', adminAuth, async (req, res) => {
  const status = ['open', 'answered', 'closed'].includes(req.body.status) ? req.body.status : 'open';
  const { rows } = await db.query(
    'UPDATE support_tickets SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'التذكرة غير موجودة' });
  res.json({ ...rows[0], number: TKT(rows[0].id) });
});

router.delete('/:id', adminAuth, async (req, res) => {
  await db.query('DELETE FROM support_tickets WHERE id=$1', [req.params.id]);
  res.json({ message: 'تم حذف التذكرة' });
});

module.exports = router;
