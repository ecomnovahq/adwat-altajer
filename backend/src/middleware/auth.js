const jwt = require('jsonwebtoken');
const db = require('../config/db');

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح لك' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, email, name, is_admin, tools_access FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'المستخدم غير موجود' });
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'رمز التحقق غير صالح أو منتهي الصلاحية' });
  }
};

const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, email, name, is_admin, tools_access FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (rows[0]) req.user = rows[0];
  } catch {}
  next();
};

const adminAuth = async (req, res, next) => {
  await auth(req, res, () => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'هذه الصفحة للمدير فقط' });
    next();
  });
};

module.exports = { auth, optionalAuth, adminAuth };
