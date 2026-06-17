// منطق الاشتراك والتجربة المجانية — مشترك بين الأدوات والمساعد
const db = require('./config/db');

async function getTrialDays() {
  try {
    const { rows } = await db.query("SELECT value FROM app_config WHERE key='trial_days'");
    const n = parseInt(rows[0] && rows[0].value);
    return isNaN(n) ? 7 : Math.max(0, n);
  } catch { return 7; }
}

// حالة اشتراك المستخدم: مشترك / تجربة فعّالة / منتهية
// user يجب أن يحوي: is_admin, created_at, subscription_until
// opts.trialDays: مدة تجربة خاصة بالأداة (تتجاوز الافتراضي العام) — null/undefined = العام
async function subscriptionState(user, opts = {}) {
  if (!user) return { locked: true, status: 'guest' };
  if (user.is_admin) return { locked: false, status: 'admin' };
  const now = Date.now();
  // اشتراك فعّال
  if (user.subscription_until && new Date(user.subscription_until).getTime() > now) {
    return { locked: false, status: 'subscribed', plan: user.plan_name || null, until: user.subscription_until };
  }
  // تجربة مجانية محسوبة من تاريخ التسجيل (خاصة بالأداة إن حُدّدت، وإلا العام)
  const trialDays = (typeof opts.trialDays === 'number' && !isNaN(opts.trialDays)) ? Math.max(0, opts.trialDays) : await getTrialDays();
  if (trialDays <= 0) return { locked: false, status: 'open' }; // 0 = تعطيل البوابة (وصول مفتوح)
  const created = user.created_at ? new Date(user.created_at).getTime() : now;
  const trialEnds = created + trialDays * 86400000;
  if (now <= trialEnds) {
    const daysLeft = Math.max(0, Math.ceil((trialEnds - now) / 86400000));
    return { locked: false, status: 'trial', daysLeft, trialEndsAt: new Date(trialEnds).toISOString(), trialDays };
  }
  return { locked: true, status: 'expired', trialEndsAt: new Date(trialEnds).toISOString(), trialDays };
}

module.exports = { getTrialDays, subscriptionState };
