// دعم البروكسي — يجعل طلبات السيرفر تظهر كزائر عادي (يتجاوز حجب المتاجر لعناوين مراكز البيانات)
// يدعم نوعين عبر PROXY_URL في .env:
//   - SOCKS5 (مثل Cloudflare WARP المجاني):  socks5://127.0.0.1:40000
//   - HTTP/HTTPS (بروكسي سكني مدفوع):        http://user:pass@gateway:port
let HttpsAgent = null, SocksAgent = null;
try { const m = require('https-proxy-agent'); HttpsAgent = m.HttpsProxyAgent || m; } catch { HttpsAgent = null; }
try { const m = require('socks-proxy-agent'); SocksAgent = m.SocksProxyAgent || m; } catch { SocksAgent = null; }

const PROXY_URL = process.env.PROXY_URL || '';
const isSocks = /^socks/i.test(PROXY_URL);

let agent = null;
if (PROXY_URL) {
  try {
    if (isSocks && SocksAgent) agent = new SocksAgent(PROXY_URL);
    else if (!isSocks && HttpsAgent) agent = new HttpsAgent(PROXY_URL);
  } catch { agent = null; }
}

// تُدمج في كل طلب axios: ...axiosProxy
const axiosProxy = agent ? { httpsAgent: agent, httpAgent: agent, proxy: false } : {};

// وسيط تشغيل المتصفّح (Puppeteer) — يدعم socks5 و http
function puppeteerProxyArgs() {
  if (!PROXY_URL) return [];
  try {
    const u = new URL(PROXY_URL);
    const server = isSocks ? `socks5://${u.host}` : u.host;
    return ['--proxy-server=' + server];
  } catch { return []; }
}
// مصادقة صفحة المتصفّح إن كان بروكسي HTTP يتطلب user:pass (SOCKS المحلي لا يحتاج)
async function authenticatePage(page) {
  if (!PROXY_URL || isSocks) return;
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
    const p = { server: isSocks ? `socks5://${u.host}` : `${u.protocol}//${u.host}` };
    if (!isSocks && u.username) { p.username = decodeURIComponent(u.username); p.password = decodeURIComponent(u.password); }
    return { proxy: p };
  } catch { return {}; }
}

module.exports = { PROXY_ON: !!PROXY_URL, axiosProxy, puppeteerProxyArgs, authenticatePage, playwrightProxy };
