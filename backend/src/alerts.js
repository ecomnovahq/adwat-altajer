// مراقبة الأخطاء: تنبيه فوري للمسؤول عند الأعطال الحرجة (بريد + Sentry اختياري)
const logger = require('./logger');
let sendMail; try { ({ sendMail } = require('./mailer')); } catch { sendMail = null; }

// Sentry اختياري — يُفعَّل فقط إذا ضُبط SENTRY_DSN وكانت الحزمة مثبّتة
let Sentry = null;
try {
  if (process.env.SENTRY_DSN) {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0,
    });
    logger.info('Sentry مفعّل لمراقبة الأخطاء');
  }
} catch { Sentry = null; }

const ALERT_EMAIL = process.env.ALERT_EMAIL || process.env.SMTP_USER || '';
const THROTTLE_MS = 60 * 60 * 1000; // تنبيه واحد لكل توقيع خطأ كل ساعة (منع الإغراق)
const _last = new Map();

function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

// context: وصف موجز لمكان الخطأ · err: كائن الخطأ أو نصّه
function alertError(context, err) {
  const message = String((err && (err.message || err)) || 'خطأ غير معروف');
  const stack = (err && err.stack) || '';

  try { if (Sentry) Sentry.captureException(err instanceof Error ? err : new Error(message), { tags: { context } }); } catch { /* تجاهل */ }

  if (!ALERT_EMAIL || !sendMail) return;
  const sig = context + '|' + message.slice(0, 120);
  const now = Date.now();
  if (_last.has(sig) && now - _last.get(sig) < THROTTLE_MS) return; // مكتوم مؤقتاً
  _last.set(sig, now);

  const html = `<div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:1.8;color:#1a1a2e;">
    <h2 style="color:#dc2626;">عطل في منصة أدوات التاجر</h2>
    <p><b>السياق:</b> ${esc(context)}</p>
    <p><b>الرسالة:</b> ${esc(message)}</p>
    <p><b>الوقت:</b> ${esc(new Date().toLocaleString('ar-EG'))}</p>
    <pre style="background:#f4f4f5;padding:10px;border-radius:8px;overflow:auto;font-size:12px;direction:ltr;text-align:left;">${esc(stack.slice(0, 2000))}</pre>
    <p style="color:#6b7280;font-size:12px;">لن يتكرّر هذا التنبيه لنفس الخطأ قبل ساعة.</p>
  </div>`;
  sendMail({ to: ALERT_EMAIL, subject: `[تنبيه عطل] ${context} — أدوات التاجر`, html }).catch(() => {});
}

module.exports = { alertError, Sentry };
