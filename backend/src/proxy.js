// دعم البروكسي — يجعل طلبات السيرفر تظهر كزائر عادي (يتجاوز حجب المتاجر لعناوين مراكز البيانات)
// فعّله بوضع PROXY_URL في .env، مثال: http://user:pass@gateway.proxy.com:8000
let HPA = null;
try { const m = require('https-proxy-agent'); HPA = m.HttpsProxyAgent || m; } catch { HPA = null; }

const PROXY_URL = process.env.PROXY_URL || '';
const agent = (PROXY_URL && HPA) ? new HPA(PROXY_URL) : null;

// تُدمج في كل طلب axios: ...axiosProxy
const axiosProxy = agent ? { httpsAgent: agent, httpAgent: agent, proxy: false } : {};

// وسيط تشغيل المتصفّح (Puppeteer/Playwright)
function puppeteerProxyArgs() {
  if (!PROXY_URL) return [];
  try { return ['--proxy-server=' + new URL(PROXY_URL).host]; } catch { return []; }
}
// مصادقة صفحة المتصفّح إن كان البروكسي يتطلب user:pass
async function authenticatePage(page) {
  if (!PROXY_URL) return;
  try {
    const u = new URL(PROXY_URL);
    if (u.username) await page.authenticate({ username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) });
  } catch { /* تجاهل */ }
}

// إعداد بروكسي لـPlaywright (chromium.launch({ ...playwrightProxy() }))
function playwrightProxy() {
  if (!PROXY_URL) return {};
  try {
    const u = new URL(PROXY_URL);
    const p = { server: u.protocol + '//' + u.host };
    if (u.username) { p.username = decodeURIComponent(u.username); p.password = decodeURIComponent(u.password); }
    return { proxy: p };
  } catch { return {}; }
}

module.exports = { PROXY_ON: !!PROXY_URL, axiosProxy, puppeteerProxyArgs, authenticatePage, playwrightProxy };
