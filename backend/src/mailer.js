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

// ─── «قيّم مشروعك مع خبير» ───────────────────────────────────────────────────
const _esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const _nl = (s) => _esc(s).replace(/\n/g, '<br>');
const _safeHref = (u) => /^https?:\/\//i.test(String(u || '')) ? _esc(u) : '';
const SOCIAL_LABELS = { instagram: 'إنستقرام', tiktok: 'تيك توك', snapchat: 'سناب شات', x: 'إكس (تويتر)', other: 'أخرى' };

function _socialHref(key, v) {
  const s = String(v || '').trim();
  if (/^https?:\/\//i.test(s)) return s;
  const h = s.replace(/^@/, '');
  if (!h || /\s/.test(h)) return '';
  if (key === 'instagram') return 'https://instagram.com/' + h;
  if (key === 'tiktok') return 'https://www.tiktok.com/@' + h;
  if (key === 'snapchat') return 'https://www.snapchat.com/add/' + h;
  if (key === 'x') return 'https://x.com/' + h;
  return /\./.test(h) ? 'https://' + h : '';
}

function expertReviewAdminHtml(r) {
  const row = (k, v) => `<tr><td style="padding:.55rem .8rem;color:#6b6385;width:130px;vertical-align:top;border-bottom:1px solid #eee;">${k}</td><td style="padding:.55rem .8rem;color:#1f0a3c;border-bottom:1px solid #eee;">${v}</td></tr>`;
  const socials = Object.entries(r.socials || {}).map(([k, v]) => {
    const href = _socialHref(k, v);
    return `<div>${SOCIAL_LABELS[k] || _esc(k)}: ${href ? `<a href="${_esc(href)}" style="color:#7c3aed;">${_esc(v)}</a>` : _esc(v)}</div>`;
  }).join('') || '<span style="color:#999;">لم تُضف</span>';
  const tags = (r.challenge_tags || []).map(t => `<span style="display:inline-block;background:#fdecef;color:#be123c;border-radius:99px;padding:2px 10px;margin:2px;font-size:12px;">${_esc(t)}</span>`).join('');
  const phoneDigits = String(r.phone || '').replace(/[^\d]/g, '').replace(/^0/, '966');
  const store = _safeHref(r.store_url);
  return `
<!DOCTYPE html><html dir="rtl" lang="ar"><body style="font-family:Tahoma,Arial,sans-serif;background:#f6f4fb;padding:1.5rem;">
<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:1.4rem 2rem;">
    <div style="color:#ede9fe;font-size:.85rem;">قيّم مشروعك مع خبير</div>
    <h1 style="color:#fff;margin:.2rem 0 0;font-size:1.3rem;">طلب تقييم جديد #${r.id}</h1>
  </div>
  <div style="padding:1.5rem 2rem;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.7;">
      ${row('الاسم', `<strong>${_esc(r.name)}</strong>`)}
      ${row('الجوال', `${_esc(r.phone)}${phoneDigits ? ` · <a href="https://wa.me/${phoneDigits}" style="color:#16a34a;">واتساب</a>` : ''}`)}
      ${row('البريد', `<a href="mailto:${_esc(r.email)}" style="color:#7c3aed;">${_esc(r.email)}</a>`)}
      ${row('المتجر', store ? `<a href="${store}" style="color:#7c3aed;">${_esc(r.store_url)}</a>` : _esc(r.store_url))}
      ${r.platform ? row('المنصة', _esc(r.platform)) : ''}
      ${row('التواصل الاجتماعي', socials)}
    </table>
    <h3 style="color:#1f0a3c;margin:1.4rem 0 .4rem;font-size:1rem;">نبذة عن المشروع</h3>
    <div style="background:#f6f4fb;border-right:3px solid #a855f7;padding:.8rem 1rem;border-radius:6px;color:#333;line-height:1.8;font-size:14px;">${_nl(r.about)}</div>
    <h3 style="color:#1f0a3c;margin:1.4rem 0 .4rem;font-size:1rem;">التحديات</h3>
    ${tags ? `<div style="margin-bottom:.5rem;">${tags}</div>` : ''}
    <div style="background:#fff7ed;border-right:3px solid #f59e0b;padding:.8rem 1rem;border-radius:6px;color:#333;line-height:1.8;font-size:14px;">${_nl(r.challenges)}</div>
    <div style="text-align:center;margin:1.6rem 0 .4rem;">
      <a href="https://adwat.cloud/pages/admin.html" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:.75rem 1.6rem;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">فتح الطلب في لوحة التحكم</a>
    </div>
  </div>
</div>
</body></html>`;
}

function expertReviewConfirmHtml(r) {
  return `
<!DOCTYPE html><html dir="rtl" lang="ar"><body style="font-family:Tahoma,Arial,sans-serif;background:#f9f9f9;padding:2rem;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:2rem;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:1.4rem;">أدوات التاجر</h1>
  </div>
  <div style="padding:2rem;">
    <h2 style="color:#1f0a3c;margin-top:0;">أهلاً ${_esc(r.name)}،</h2>
    <p style="color:#555;line-height:1.8;">استلمنا طلب تقييم مشروعك بنجاح. سيبدأ أحد خبرائنا بمراجعة متجرك وحساباتك على منصات التواصل، وتحليل التحديات التي ذكرتها.</p>
    <div style="background:#f3f0ff;border-right:3px solid #a855f7;padding:1rem 1.5rem;border-radius:6px;margin:1.5rem 0;color:#555;line-height:1.9;">
      <strong>رقم الطلب:</strong> #${r.id}<br>
      <strong>المتجر:</strong> ${_esc(r.store_url)}
    </div>
    <p style="color:#1f0a3c;font-weight:700;margin-bottom:.4rem;">ماذا ستستلم؟</p>
    <ul style="color:#555;line-height:1.9;padding-right:1.2rem;margin-top:0;">
      <li>تقييم شامل للمشروع والمتجر: التجربة، صفحات المنتجات، الثقة، والتسعير</li>
      <li>مراجعة حساباتك على منصات التواصل ومحتواك</li>
      <li>تشخيص واضح لأسباب التحديات التي تواجهك</li>
      <li>خطة عمل كاملة مرتّبة حسب الأولوية</li>
    </ul>
    <p style="color:#555;line-height:1.8;">سنتواصل معك على الجوال أو البريد إذا احتجنا أي تفاصيل إضافية.</p>
  </div>
  <div style="background:#f9f9f9;padding:1rem 2rem;text-align:center;color:#999;font-size:0.85rem;">
    © 2026 أدوات التاجر — خبراء المنصات
  </div>
</div>
</body></html>`;
}

module.exports = { sendMail, bookingConfirmationHtml, passwordResetHtml, verifyCodeHtml, expertReviewAdminHtml, expertReviewConfirmHtml };
