require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./logger');
const { alertError } = require('./alerts');

process.on('unhandledRejection', (err) => {
  logger.error('unhandledRejection', { message: err.message, stack: err.stack });
  alertError('unhandledRejection', err);
});

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { message: err.message, stack: err.stack });
  alertError('uncaughtException', err);
  process.exit(1);
});

const app = express();
const db = require('./config/db');

// ─── Auto-init critical tables ────────────────────────────────────────────────
db.query(`
  CREATE TABLE IF NOT EXISTS tool_settings (
    tool_name        VARCHAR(100) PRIMARY KEY,
    display_name     VARCHAR(255) NOT NULL,
    is_paid          BOOLEAN DEFAULT FALSE,
    daily_free_limit INTEGER DEFAULT NULL,
    updated_at       TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() => db.query(`
  INSERT INTO tool_settings (tool_name, display_name, is_paid, daily_free_limit) VALUES
    ('analyzer',        'محلل المتجر الذكي',         false, 10),
    ('generator',       'مولّد المحتوى',             false, 10),
    ('image-gen',       'مولّد صور المنتجات',        false,  5),
    ('whatsapp',        'قوالب واتساب',              false,  5),
    ('competitor',      'محلل المنافسين',            false,  5),
    ('social-plan',     'خطة السوشيال ميديا',        false,  3),
    ('store-policies',  'سياسات المتجر',             false,  5),
    ('launch-campaign', 'حملة الإطلاق',              false,  3),
    ('assistant',       'مساعد التاجر',              false,  NULL)
  ON CONFLICT (tool_name) DO NOTHING
`)).then(() =>
  // حالة الظهور + ترتيب العرض (يتحكم بهما الأدمن، وينعكسان على كل الواجهات)
  db.query(`ALTER TABLE tool_settings ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'`)
).then(() =>
  db.query(`ALTER TABLE tool_settings ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 100`)
).then(() =>
  db.query(`ALTER TABLE tool_settings ADD COLUMN IF NOT EXISTS price NUMERIC`)
).then(() =>
  db.query(`ALTER TABLE tool_settings ADD COLUMN IF NOT EXISTS badge VARCHAR(40)`)
).then(() =>
  db.query(`ALTER TABLE tool_settings ADD COLUMN IF NOT EXISTS features JSONB`)
).catch(e => logger.error('tool_settings init error:', e.message));

// باقات الاشتراك (يديرها الأدمن وتظهر في صفحة الأسعار)
db.query(`
  CREATE TABLE IF NOT EXISTS plans (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    price       NUMERIC,
    period      VARCHAR(30) DEFAULT 'شهرياً',
    badge       VARCHAR(40),
    features    JSONB,
    tools       JSONB,
    sort_order  INTEGER NOT NULL DEFAULT 100,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('plans init error:', e.message));

db.query(`
  CREATE TABLE IF NOT EXISTS tool_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER,
    tool_name   VARCHAR(100) NOT NULL,
    input_data  JSONB,
    result_data JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('tool_logs init error:', e.message));

// تتبّع آخر ظهور للمستخدم (لمعرفة المتصلين حالياً)
db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ`)
  .catch(e => logger.error('users.last_seen init error:', e.message));
// رقم جوال المستخدم
db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`)
  .catch(e => logger.error('users.phone init error:', e.message));
// أكواد التحقق (تسجيل / استعادة كلمة المرور) — كود من 6 أرقام عبر البريد
db.query(`
  CREATE TABLE IF NOT EXISTS email_codes (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    code       VARCHAR(6) NOT NULL,
    purpose    VARCHAR(20) NOT NULL,
    payload    JSONB,
    attempts   INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('email_codes init error:', e.message));

// طلبات تحليل المتاجر — تصل للأدمن بتفاصيل العميل والتقرير
db.query(`
  CREATE TABLE IF NOT EXISTS analysis_submissions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER,
    store_url  TEXT NOT NULL,
    store_name VARCHAR(255),
    platform   VARCHAR(50),
    category   VARCHAR(120),
    score      INTEGER,
    report     JSONB,
    status     VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('analysis_submissions init error:', e.message));

// تذاكر الدعم + رسائل الدردشة
db.query(`
  CREATE TABLE IF NOT EXISTS support_tickets (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    topic      VARCHAR(120) NOT NULL DEFAULT 'عام',
    status     VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() => db.query(`
  CREATE TABLE IF NOT EXISTS support_messages (
    id         SERIAL PRIMARY KEY,
    ticket_id  INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender     VARCHAR(10) NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`)).then(() =>
  db.query(`ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false`)
).catch(e => logger.error('support tables init error:', e.message));

// أقسام الكوبونات — يتحكم بها الأدمن (إضافة/حذف/ترتيب)
db.query(`
  CREATE TABLE IF NOT EXISTS coupon_categories (
    id         SERIAL PRIMARY KEY,
    slug       VARCHAR(60) UNIQUE NOT NULL,
    name       VARCHAR(120) NOT NULL,
    icon       VARCHAR(40) DEFAULT 'tag',
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() => db.query(`
  INSERT INTO coupon_categories (slug, name, icon, sort_order) VALUES
    ('platforms','منصات متاجر','platforms',10),
    ('shipping','شحن','shipping',20),
    ('payment','دفع','payment',30),
    ('design','تصميم','design',40),
    ('ads','إعلانات','ads',50),
    ('support','خدمة عملاء','support',60),
    ('analytics','تحليلات','analytics',70),
    ('photography','تصوير','photography',80),
    ('content','محتوى','content',90),
    ('seo','SEO','seo',100)
  ON CONFLICT (slug) DO NOTHING
`)).catch(e => logger.error('coupon_categories init error:', e.message));

db.query(`
  CREATE TABLE IF NOT EXISTS tool_access_requests (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    tool_name  VARCHAR(100) NOT NULL,
    reason     TEXT,
    status     VARCHAR(50) DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('tool_access_requests init error:', e.message));

// ─── مساعد التاجر — متجر العميل المحفوظ + منتجاته + لقطاته + تنبيهاته + محادثته ──
db.query(`
  CREATE TABLE IF NOT EXISTS merchant_stores (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL,
    store_url    TEXT NOT NULL,
    store_name   VARCHAR(255),
    platform     VARCHAR(50),
    latest_score INTEGER,
    latest_report JSONB,
    product_limit INTEGER NOT NULL DEFAULT 100,
    last_synced_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id)
  )
`).then(() =>
  db.query(`ALTER TABLE merchant_stores ADD COLUMN IF NOT EXISTS product_limit INTEGER NOT NULL DEFAULT 100`)
).catch(e => logger.error('merchant_stores init:', e.message));
db.query(`
  CREATE TABLE IF NOT EXISTS store_products (
    id          SERIAL PRIMARY KEY,
    store_id    INTEGER NOT NULL,
    url         TEXT, name VARCHAR(300), price VARCHAR(40), currency VARCHAR(10),
    image       TEXT, description TEXT, category VARCHAR(120), has_description BOOLEAN DEFAULT false,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() =>
  db.query(`ALTER TABLE store_products ADD COLUMN IF NOT EXISTS category VARCHAR(120)`)
).catch(e => logger.error('store_products init:', e.message));
db.query(`
  CREATE TABLE IF NOT EXISTS assistant_snapshots (
    id         SERIAL PRIMARY KEY,
    store_id   INTEGER NOT NULL,
    score      INTEGER,
    report     JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('assistant_snapshots init:', e.message));
db.query(`
  CREATE TABLE IF NOT EXISTS store_alerts (
    id         SERIAL PRIMARY KEY,
    store_id   INTEGER NOT NULL,
    type       VARCHAR(40), severity VARCHAR(20) DEFAULT 'info',
    message    TEXT, seen BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('store_alerts init:', e.message));
db.query(`
  CREATE TABLE IF NOT EXISTS store_tasks (
    id         SERIAL PRIMARY KEY,
    store_id   INTEGER NOT NULL,
    text       TEXT NOT NULL,
    done       BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('store_tasks init:', e.message));
db.query(`
  CREATE TABLE IF NOT EXISTS assistant_chats (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    role       VARCHAR(12) NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() =>
  db.query(`ALTER TABLE assistant_chats ADD COLUMN IF NOT EXISTS store_id INTEGER`)
).catch(e => logger.error('assistant_chats init:', e.message));

// ─── ترقيات مساعد التاجر: تعدّد المتاجر + معرض الصور + محتوى مولّد + سجل التغييرات ──
db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS max_stores INTEGER NOT NULL DEFAULT 1`)
  .catch(e => logger.error('users.max_stores init:', e.message));
db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_quota INTEGER NOT NULL DEFAULT 300`)
  .catch(e => logger.error('users.ai_quota init:', e.message));
db.query(`ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS attachments JSONB`)
  .catch(e => logger.error('support_messages.attachments init:', e.message));
db.query(`ALTER TABLE merchant_stores DROP CONSTRAINT IF EXISTS merchant_stores_user_id_key`)
  .catch(e => logger.error('drop merchant_stores unique:', e.message));
db.query(`ALTER TABLE merchant_stores ADD COLUMN IF NOT EXISTS ga_property_id TEXT`)
  .catch(e => logger.error('merchant_stores.ga_property_id init:', e.message));
db.query(`ALTER TABLE merchant_stores ADD COLUMN IF NOT EXISTS target_score INTEGER`)
  .catch(e => logger.error('merchant_stores.target_score init:', e.message));
db.query(`ALTER TABLE merchant_stores ADD COLUMN IF NOT EXISTS auto_generate BOOLEAN NOT NULL DEFAULT false`)
  .catch(e => logger.error('merchant_stores.auto_generate init:', e.message));
db.query(`ALTER TABLE merchant_stores ADD COLUMN IF NOT EXISTS competitor_url TEXT`)
  .catch(e => logger.error('merchant_stores.competitor_url init:', e.message));
db.query(`
  CREATE TABLE IF NOT EXISTS competitor_snapshots (
    id         SERIAL PRIMARY KEY,
    store_id   INTEGER NOT NULL,
    name       VARCHAR(255),
    products   INTEGER,
    categories INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).then(() =>
  db.query(`ALTER TABLE competitor_snapshots ADD COLUMN IF NOT EXISTS competitor_id INTEGER`)
).catch(e => logger.error('competitor_snapshots init:', e.message));
// قائمة المنافسين المتابَعين (قسم «مراقبة المنافسين»)
db.query(`
  CREATE TABLE IF NOT EXISTS competitors (
    id         SERIAL PRIMARY KEY,
    store_id   INTEGER NOT NULL,
    url        TEXT NOT NULL,
    name       VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('competitors init:', e.message));
// تحليل بشري من فريق الخبراء يُغذّي لوحة العميل والمساعد الذكي
db.query(`
  CREATE TABLE IF NOT EXISTS store_admin_insights (
    id         SERIAL PRIMARY KEY,
    store_id   INTEGER NOT NULL,
    kind       VARCHAR(40) DEFAULT 'insight',
    title      VARCHAR(255),
    body       TEXT,
    pinned     BOOLEAN DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('store_admin_insights init:', e.message));
db.query(`ALTER TABLE store_products ADD COLUMN IF NOT EXISTS images JSONB`)
  .catch(e => logger.error('store_products.images init:', e.message));
db.query(`ALTER TABLE store_products ADD COLUMN IF NOT EXISTS seo JSONB`)
  .catch(e => logger.error('store_products.seo init:', e.message));
db.query(`ALTER TABLE store_products ADD COLUMN IF NOT EXISTS bullets JSONB`)
  .catch(e => logger.error('store_products.bullets init:', e.message));
db.query(`
  CREATE TABLE IF NOT EXISTS product_revisions (
    id         SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    store_id   INTEGER NOT NULL,
    field      VARCHAR(40) NOT NULL,
    before_val TEXT,
    after_val  TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(e => logger.error('product_revisions init:', e.message));

// ─── فهارس الأداء (تُسرّع لوحة التحكم والتحليلات مع نمو البيانات) ────────────────
db.query(`
  CREATE INDEX IF NOT EXISTS idx_tool_logs_user_created ON tool_logs (user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tool_logs_tool_created ON tool_logs (tool_name, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_analysis_user_created  ON analysis_submissions (user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_analysis_status        ON analysis_submissions (status);
  CREATE INDEX IF NOT EXISTS idx_support_msgs_ticket    ON support_messages (ticket_id);
  CREATE INDEX IF NOT EXISTS idx_users_last_seen        ON users (last_seen);
  CREATE INDEX IF NOT EXISTS idx_email_codes_email      ON email_codes (email);
`).catch(e => logger.error('indexes init error:', e.message));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));
// رؤوس أمان (تسمح بتحميل الموارد عبر النطاقات للأدوات والصور)
app.use(helmet({
  contentSecurityPolicy: false, // الواجهة منفصلة (static) — نتركها للسيرفر الأمامي
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || false)
    : true,
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200, // رُفع لاستيعاب الـpolling (نبضة الحضور، التحليلات، متابعة التذاكر، تقدّم المزامنة)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً، انتظر قليلاً وحاول مجدداً' },
  // لا تُحتسب الطلبات الخفيفة المتكررة (الاستطلاع) ضمن الحد
  skip: (req) => {
    const u = req.originalUrl || '';
    return req.method === 'OPTIONS'
      || u.includes('/auth/heartbeat')
      || u.includes('/health')
      || /\/tickets\/\d+\/messages/.test(u)
      || u.includes('/assistant/sync/progress')   // يُستطلع كل ثانية أثناء المزامنة
      || u.includes('/assistant/usage')
      || u.includes('/assistant/competitor-timeline')
      || (u.includes('/assistant/competitors') && req.method === 'GET')
      || u.includes('/admin/stats/full');
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  // الطلبات الخفيفة (GET: الإعدادات، السجل) لا تُحتسب ضمن حد الأدوات الذكية
  skip: (req) => req.method === 'GET',
  message: { error: 'تجاوزت الحد المسموح لاستخدام الأدوات الذكية في هذه الساعة' },
});

// حد صارم لمسارات المصادقة الحساسة — حماية من تخمين كلمة المرور وإغراق الرموز
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12, // 12 محاولة لكل IP خلال 15 دقيقة
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات كثيرة جداً. انتظر 15 دقيقة ثم حاول مجدداً.' },
});

app.use('/api/', globalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
// الحد الصارم على نقاط الدخول/التسجيل/استرجاع كلمة المرور فقط (لا يشمل النبضة)
['login', 'register', 'register-init', 'verify-email', 'resend-code', 'forgot-password', 'reset-password']
  .forEach(p => app.use(`/api/auth/${p}`, authLimiter));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tools', aiLimiter, require('./routes/tools'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/works', require('./routes/works'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/integrations', require('./routes/integrations'));
const assistantRouter = require('./routes/assistant');
app.use('/api/assistant', assistantRouter);

// Health check
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// 404
app.use('/api/*', (req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

// Error handler
app.use(errorHandler);

// ─── مهمة يومية: إعادة فحص متاجر «مساعد التاجر» وتحديث النتائج والتنبيهات ────────
try {
  const cron = require('node-cron');
  // كل يوم الساعة 3 فجراً (توقيت الخادم)
  cron.schedule('0 3 * * *', async () => {
    try {
      const { rows } = await db.query('SELECT * FROM merchant_stores ORDER BY last_synced_at ASC NULLS FIRST');
      logger.info(`[cron] مزامنة ${rows.length} متجر في مساعد التاجر`);
      for (const store of rows) {
        try { await assistantRouter.syncStore(store); }
        catch (e) { logger.warn(`[cron] فشل مزامنة متجر ${store.id}: ${e.message?.slice(0, 60)}`); }
        await new Promise(r => setTimeout(r, 3000)); // فاصل بسيط بين المتاجر
      }
      logger.info('[cron] اكتملت المزامنة اليومية');
    } catch (e) { logger.error('[cron] خطأ المزامنة اليومية: ' + e.message); }
  });
  logger.info('✓ مهمة المزامنة اليومية لمساعد التاجر مفعّلة (3:00 صباحاً)');

  // تقرير أسبوعي بالبريد — كل أحد 8 صباحاً
  const { sendMail } = require('./mailer');
  cron.schedule('0 8 * * 0', async () => {
    try {
      const { rows } = await db.query(`
        SELECT s.store_name, s.store_url, s.platform, s.latest_score, s.latest_report, u.name AS user_name, u.email
        FROM merchant_stores s JOIN users u ON u.id=s.user_id WHERE u.email IS NOT NULL`);
      logger.info(`[cron] تقرير أسبوعي لـ ${rows.length} تاجر`);
      let renderStoreReportPdf; try { ({ renderStoreReportPdf } = require('./report-pdf')); } catch { renderStoreReportPdf = null; }
      for (const s of rows) {
        const rep = s.latest_report || {};
        const recs = (rep.recommendations || []).slice(0, 3);
        const esc = t => String(t ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
        const html = `<div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:1.9;color:#1a1a2e;">
          <h2 style="color:#6d28d9;">تقريرك الأسبوعي — ${esc(s.store_name || 'متجرك')}</h2>
          <p>التقييم الحالي: <b style="font-size:1.2em;">${s.latest_score ?? '—'}/100</b></p>
          <p>${esc(rep.summary || '')}</p>
          ${recs.length ? `<h3 style="color:#6d28d9;">أهم 3 توصيات هذا الأسبوع:</h3><ul>${recs.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
          <p style="margin-top:16px;">التقرير الكامل مرفق بصيغة PDF. افتح «مساعد التاجر» لمتابعة خطتك ورفع تقييم متجرك.</p>
          <div style="color:#999;font-size:11px;margin-top:18px;">أدوات التاجر — خبراء المنصات</div></div>`;
        let attachments;
        if (renderStoreReportPdf) {
          try { const pdf = await renderStoreReportPdf(s); if (pdf) attachments = [{ filename: `تقرير-${(s.store_name || 'المتجر').replace(/[\\/:*?"<>|]/g, '')}.pdf`, content: pdf }]; } catch {}
        }
        sendMail({ to: s.email, subject: `تقريرك الأسبوعي — ${s.store_name || 'متجرك'}`, html, attachments }).catch(() => {});
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) { logger.error('[cron] تقرير أسبوعي خطأ: ' + e.message); }
  });
  logger.info('✓ التقرير الأسبوعي بالبريد مفعّل (الأحد 8 صباحاً)');

  // نسخ احتياطي يومي لقاعدة البيانات — 4 صباحاً
  const { runBackup } = require('../scripts/backup');
  cron.schedule('0 4 * * *', async () => {
    try { const f = await runBackup(); logger.info('[cron] نسخة احتياطية يومية جاهزة: ' + require('path').basename(f)); }
    catch (e) { logger.error('[cron] فشل النسخ الاحتياطي: ' + e.message); alertError('daily-backup', e); }
  });
  logger.info('✓ النسخ الاحتياطي اليومي لقاعدة البيانات مفعّل (4 صباحاً)');
} catch (e) { logger.warn('node-cron غير متاح — المزامنة اليدوية فقط'); }

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`✓ Adwat Altajer backend http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
