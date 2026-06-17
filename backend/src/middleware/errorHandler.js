const logger = require('../logger');
const { alertError } = require('../alerts');

const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.path} — ${err.message}`, { stack: err.stack });
  const status = err.status || 500;
  if (status >= 500) alertError(`${req.method} ${req.path}`, err); // تنبيه للمسؤول على أخطاء الخادم فقط
  res.status(status).json({
    error: err.message || 'خطأ داخلي في الخادم',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
