const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const logger = require('../logger');

const ar = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const SALLA_BASE = 'https://api.salla.dev/admin/v2';

// تأكد من وجود عمود توكن سلة
db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS salla_token TEXT`).catch(() => {});

async function getToken(userId) {
  const { rows } = await db.query('SELECT salla_token FROM users WHERE id=$1', [userId]);
  return rows[0]?.salla_token || null;
}

function sallaClient(token) {
  return axios.create({
    baseURL: SALLA_BASE,
    timeout: 20000,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
}

// حفظ/تحديث توكن سلة للتاجر + اختبار الاتصال
router.post('/salla/connect', auth, ar(async (req, res) => {
  const token = String(req.body.token || '').trim();
  if (token.length < 10) return res.status(400).json({ error: 'التوكن غير صالح' });
  try {
    // تحقق من صحة التوكن عبر طلب بيانات المتجر
    const cl = sallaClient(token);
    const r = await cl.get('/store/info').catch(() => cl.get('/products?per_page=1'));
    await db.query('UPDATE users SET salla_token=$1 WHERE id=$2', [token, req.user.id]);
    const storeName = r.data?.data?.name || r.data?.data?.[0]?.store?.name || 'متجرك';
    res.json({ ok: true, store: storeName });
  } catch (e) {
    const status = e.response?.status;
    res.status(400).json({ error: status === 401 ? 'التوكن غير صحيح أو منتهي. تأكد من نسخه كاملاً.' : 'تعذّر الاتصال بسلة. تحقق من التوكن.' });
  }
}));

// حالة الربط
router.get('/salla/status', auth, ar(async (req, res) => {
  const token = await getToken(req.user.id);
  res.json({ connected: !!token });
}));

// فصل الربط
router.delete('/salla/disconnect', auth, ar(async (req, res) => {
  await db.query('UPDATE users SET salla_token=NULL WHERE id=$1', [req.user.id]);
  res.json({ ok: true });
}));

// استيراد منتجات المتجر
router.get('/salla/products', auth, ar(async (req, res) => {
  const token = await getToken(req.user.id);
  if (!token) return res.status(400).json({ error: 'لم تربط متجر سلة بعد.' });
  const page = Math.max(1, parseInt(req.query.page) || 1);
  try {
    const cl = sallaClient(token);
    const r = await cl.get(`/products?per_page=20&page=${page}`);
    const items = (r.data?.data || []).map(p => ({
      id: p.id,
      name: p.name,
      price: p.price?.amount ?? p.price ?? null,
      image: p.main_image || (p.images?.[0]?.url) || null,
      hasDescription: !!(p.description && String(p.description).replace(/<[^>]+>/g, '').trim().length > 20),
    }));
    res.json({ products: items, pagination: r.data?.pagination || null });
  } catch (e) {
    const status = e.response?.status;
    if (status === 401) return res.status(401).json({ error: 'انتهت صلاحية توكن سلة. أعد الربط.' });
    logger.error('Salla products error:', e.message);
    res.status(502).json({ error: 'تعذّر جلب المنتجات من سلة.' });
  }
}));

// إرجاع الوصف (و/أو حقول SEO) لمنتج في سلة
router.put('/salla/products/:id', auth, ar(async (req, res) => {
  const token = await getToken(req.user.id);
  if (!token) return res.status(400).json({ error: 'لم تربط متجر سلة بعد.' });
  const body = {};
  if (typeof req.body.description === 'string' && req.body.description.trim()) body.description = req.body.description;
  if (typeof req.body.metadata_title === 'string' && req.body.metadata_title.trim()) body.metadata_title = req.body.metadata_title.slice(0, 60);
  if (typeof req.body.metadata_description === 'string' && req.body.metadata_description.trim()) body.metadata_description = req.body.metadata_description.slice(0, 160);
  if (!Object.keys(body).length) return res.status(400).json({ error: 'لا يوجد محتوى للحفظ.' });
  try {
    const cl = sallaClient(token);
    await cl.put(`/products/${req.params.id}`, body);
    res.json({ ok: true });
  } catch (e) {
    const status = e.response?.status;
    if (status === 401) return res.status(401).json({ error: 'انتهت صلاحية توكن سلة. أعد الربط.' });
    logger.error('Salla update error:', e.message);
    res.status(502).json({ error: 'تعذّر تحديث المنتج في سلة.' });
  }
}));

// ─── تكامل Google Analytics (GA4) — أداء المتجر: زوّار/مصادر/تحويل ──────────────
// يتطلب حساب خدمة Google (GOOGLE_APPLICATION_CREDENTIALS) مُضافاً كـ Viewer على خاصية GA4 للتاجر.
let _gaClient; let _gaTried = false;
function gaClient() {
  if (_gaTried) return _gaClient;
  _gaTried = true;
  try {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GA_CREDENTIALS_JSON) { _gaClient = null; return null; }
    const { BetaAnalyticsDataClient } = require('@google-analytics/data');
    const opts = {};
    if (process.env.GA_CREDENTIALS_JSON) { try { opts.credentials = JSON.parse(process.env.GA_CREDENTIALS_JSON); } catch {} }
    _gaClient = new BetaAnalyticsDataClient(opts);
  } catch (e) { logger.warn('GA client init failed: ' + e.message); _gaClient = null; }
  return _gaClient;
}
async function myStore(userId, storeId) {
  const { rows } = storeId
    ? await db.query('SELECT * FROM merchant_stores WHERE id=$1 AND user_id=$2', [storeId, userId])
    : await db.query('SELECT * FROM merchant_stores WHERE user_id=$1 ORDER BY id ASC LIMIT 1', [userId]);
  return rows[0] || null;
}

router.get('/ga/status', auth, ar(async (req, res) => {
  const store = await myStore(req.user.id, req.query.storeId);
  res.json({ connected: !!(store && store.ga_property_id), propertyId: store?.ga_property_id || null, serverReady: !!gaClient() });
}));

router.post('/ga/connect', auth, ar(async (req, res) => {
  const store = await myStore(req.user.id, req.body.storeId);
  if (!store) return res.status(400).json({ error: 'أضف متجرك أولاً' });
  const pid = String(req.body.propertyId || '').replace(/[^0-9]/g, '');
  if (!pid) return res.status(400).json({ error: 'أدخل Property ID رقمياً (من إعدادات GA4)' });
  await db.query('UPDATE merchant_stores SET ga_property_id=$1 WHERE id=$2', [pid, store.id]);
  res.json({ ok: true, propertyId: pid });
}));

router.delete('/ga/disconnect', auth, ar(async (req, res) => {
  const store = await myStore(req.user.id, req.query.storeId || req.body.storeId);
  if (store) await db.query('UPDATE merchant_stores SET ga_property_id=NULL WHERE id=$1', [store.id]);
  res.json({ ok: true });
}));

router.get('/ga/report', auth, ar(async (req, res) => {
  const store = await myStore(req.user.id, req.query.storeId);
  if (!store || !store.ga_property_id) return res.status(400).json({ error: 'لم تربط Google Analytics لهذا المتجر.', needsConnect: true });
  const client = gaClient();
  if (!client) return res.status(503).json({ error: 'تكامل Google Analytics غير مُفعّل على الخادم بعد. تواصل مع الدعم لتفعيله.', needsSetup: true });
  const property = `properties/${store.ga_property_id}`;
  try {
    const [core] = await client.runReport({
      property,
      dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'conversions' }, { name: 'averageSessionDuration' }, { name: 'bounceRate' }],
    });
    const m = core.rows?.[0]?.metricValues || [];
    const num = i => Number(m[i]?.value || 0);
    const [sources] = await client.runReport({
      property, dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 6,
    });
    const [pages] = await client.runReport({
      property, dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pageTitle' }], metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 6,
    });
    res.json({
      ok: true, range: 'آخر 28 يوماً',
      users: num(0), sessions: num(1), pageViews: num(2), conversions: num(3),
      avgDuration: Math.round(num(4)), bounceRate: Math.round(num(5) * 100) / 100,
      sources: (sources.rows || []).map(r => ({ name: r.dimensionValues[0].value, sessions: Number(r.metricValues[0].value) })),
      topPages: (pages.rows || []).map(r => ({ title: r.dimensionValues[0].value, views: Number(r.metricValues[0].value) })),
    });
  } catch (e) {
    logger.warn('GA report error: ' + (e.message || '').slice(0, 120));
    const msg = /permission|PERMISSION|403/.test(e.message || '')
      ? 'لا توجد صلاحية للوصول لهذه الخاصية. أضف بريد حساب الخدمة كـ Viewer في GA4.'
      : 'تعذّر جلب بيانات Google Analytics. تأكد من Property ID.';
    res.status(502).json({ error: msg });
  }
}));

module.exports = router;
