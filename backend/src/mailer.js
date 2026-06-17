const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendMail({ to, subject, html, attachments }) {
  if (!process.env.SMTP_USER) {
    logger.warn('SMTP_USER not configured — email skipped');
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"أدوات التاجر" <${process.env.SMTP_USER}>`,
      to, subject, html,
      ...(Array.isArray(attachments) && attachments.length ? { attachments } : {}),
    });
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
    return false;
  }
}

function verifyCodeHtml({ name, code, title, intro }) {
  return `
<!DOCTYPE html><html dir="rtl" lang="ar"><body style="font-family:Arial,sans-serif;background:#f9f9f9;padding:2rem;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:2rem;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:1.4rem;">أدوات التاجر</h1>
  </div>
  <div style="padding:2rem;text-align:center;">
    <h2 style="color:#1f0a3c;margin-top:0;">${title || 'رمز التحقق'}</h2>
    <p style="color:#555;line-height:1.7;">${name ? 'مرحباً ' + name + '،<br>' : ''}${intro || 'استخدم الرمز التالي لإكمال العملية:'}</p>
    <div style="margin:1.8rem 0;">
      <span style="display:inline-block;background:#f3f0ff;border:1px dashed #a855f7;color:#7c3aed;font-size:2rem;font-weight:800;letter-spacing:.6rem;padding:1rem 1.5rem;border-radius:12px;">${code}</span>
    </div>
    <p style="color:#999;font-size:0.85rem;">هذا الرمز صالح لمدة 10 دقائق فقط. إذا لم تطلب هذا، تجاهل البريد.</p>
  </div>
  <div style="background:#f9f9f9;padding:1rem 2rem;text-align:center;color:#999;font-size:0.85rem;">
    © 2026 أدوات التاجر — جميع الحقوق محفوظة
  </div>
</div>
</body></html>`;
}

function bookingConfirmationHtml({ name, service_type, id }) {
  return `
<!DOCTYPE html><html dir="rtl" lang="ar"><body style="font-family:Arial,sans-serif;background:#f9f9f9;padding:2rem;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:2rem;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:1.4rem;">أدوات التاجر</h1>
  </div>
  <div style="padding:2rem;">
    <h2 style="color:#1f0a3c;margin-top:0;">مرحباً ${name}!</h2>
    <p style="color:#555;line-height:1.7;">
      تم استلام طلبك بنجاح وسنتواصل معك خلال <strong>24 ساعة</strong>.
    </p>
    <div style="background:#f3f0ff;border-right:3px solid #a855f7;padding:1rem 1.5rem;border-radius:6px;margin:1.5rem 0;">
      <p style="margin:0;color:#555;">
        <strong>الخدمة المطلوبة:</strong> ${service_type || 'غير محددة'}<br>
        <strong>رقم الطلب:</strong> #${id}
      </p>
    </div>
    <p style="color:#555;line-height:1.7;">
      إذا كان لديك أي استفسار، تواصل معنا عبر واتساب أو البريد الإلكتروني.
    </p>
  </div>
  <div style="background:#f9f9f9;padding:1rem 2rem;text-align:center;color:#999;font-size:0.85rem;">
    © 2026 أدوات التاجر — جميع الحقوق محفوظة
  </div>
</div>
</body></html>`;
}

function passwordResetHtml({ name, resetUrl }) {
  return `
<!DOCTYPE html><html dir="rtl" lang="ar"><body style="font-family:Arial,sans-serif;background:#f9f9f9;padding:2rem;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:2rem;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:1.4rem;">أدوات التاجر</h1>
  </div>
  <div style="padding:2rem;">
    <h2 style="color:#1f0a3c;margin-top:0;">إعادة تعيين كلمة المرور</h2>
    <p style="color:#555;line-height:1.7;">مرحباً ${name}،<br>تلقينا طلباً لإعادة تعيين كلمة مرور حسابك.</p>
    <div style="text-align:center;margin:2rem 0;">
      <a href="${resetUrl}" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:0.9rem 2rem;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">
        إعادة تعيين كلمة المرور
      </a>
    </div>
    <p style="color:#999;font-size:0.85rem;">هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة التعيين، تجاهل هذا البريد.</p>
  </div>
  <div style="background:#f9f9f9;padding:1rem 2rem;text-align:center;color:#999;font-size:0.85rem;">
    © 2026 أدوات التاجر — جميع الحقوق محفوظة
  </div>
</div>
</body></html>`;
}

module.exports = { sendMail, bookingConfirmationHtml, passwordResetHtml, verifyCodeHtml };
