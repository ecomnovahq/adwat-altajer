require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./logger');

process.on('unhandledRejection', (err) => {
  logger.error('unhandledRejection', { message: err.message, stack: err.stack });
});

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { message: err.message, stack: err.stack });
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
    ('analyzer',        'محلل المتاجر',              false, 10),
    ('generator',       'مولّد المحتوى',             false, 10),
    ('image-gen',       'مولّد صور المنتجات',        false,  5),
    ('whatsapp',        'قوالب واتساب',              false,  5),
    ('competitor',      'محلل المنافسين',            false,  5),
    ('social-plan',     'خطة السوشيال ميديا',        false,  3),
    ('store-policies',  'سياسات المتجر',             false,  5),
    ('launch-campaign', 'حملة الإطلاق',              false,  3)
  ON CONFLICT (tool_name) DO NOTHING
`)).catch(e => logger.error('tool_settings init error:', e.message));

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

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || false)
    : true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً، انتظر قليلاً وحاول مجدداً' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'تجاوزت الحد المسموح لاستخدام الأدوات الذكية في هذه الساعة' },
});

app.use('/api/', globalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tools', aiLimiter, require('./routes/tools'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/works', require('./routes/works'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/blog', require('./routes/blog'));

// Health check
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// 404
app.use('/api/*', (req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

// Error handler
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`✓ Adwat Altajer backend http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
