// توليد تقرير المتجر كـ PDF (للتقرير الأسبوعي بالبريد) عبر Puppeteer
const logger = require('./logger');
const CHROME_PATH = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const esc = t => String(t ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function buildHtml(s) {
  const rep = s.latest_report || {};
  const score = s.latest_score ?? 0;
  const scol = score >= 80 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626';
  const sec = (t, arr, c) => (arr && arr.length) ? `<h2>${t}</h2><ul>${arr.map(x => `<li style="color:${c || '#1a1a2e'}">${esc(x)}</li>`).join('')}</ul>` : '';
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
  <style>
  *{box-sizing:border-box;} body{font-family:Tahoma,Arial,sans-serif;color:#1a1a2e;margin:0;padding:30px 34px;line-height:1.9;}
  .hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #6d28d9;padding-bottom:16px;margin-bottom:20px;}
  .hd h1{color:#6d28d9;margin:0;font-size:22px;} .hd .sub{color:#777;font-size:13px;margin-top:4px;}
  .ring{width:96px;height:96px;border-radius:50%;background:conic-gradient(${scol} ${score*3.6}deg,#eee 0);display:flex;align-items:center;justify-content:center;}
  .ring i{width:74px;height:74px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;font-style:normal;}
  .ring b{font-size:26px;color:${scol};} .ring s{font-size:10px;color:#999;text-decoration:none;}
  .meta{background:#f7f5ff;border:1px solid #e6e0fa;border-radius:10px;padding:12px 16px;font-size:13px;margin-bottom:18px;} .meta b{color:#6d28d9;}
  h2{color:#6d28d9;font-size:15px;border-bottom:1px solid #eee;padding-bottom:5px;margin:22px 0 8px;}
  ul{padding-inline-start:20px;margin:6px 0;} li{margin:4px 0;font-size:13.5px;}
  .foot{margin-top:26px;border-top:1px solid #eee;padding-top:10px;font-size:11px;color:#999;text-align:center;}
  </style></head><body>
  <div class="hd"><div><h1>تقرير متجر ${esc(s.store_name || 'متجرك')}</h1><div class="sub">${esc(s.platform || '')} · ${esc(s.store_url || '')}</div></div>
    <div class="ring"><i><b>${score}</b><s>من 100</s></i></div></div>
  <div class="meta"><b>المنتجات:</b> ${rep.productsCount ?? '—'} &nbsp;|&nbsp; <b>الأقسام:</b> ${(rep.categories || []).length} &nbsp;|&nbsp; <b>الصفحات:</b> ${rep.pagesCount ?? '—'}</div>
  <h2>ملخّص الحالة</h2><p style="font-size:13.5px;">${esc(rep.summary || '')}</p>
  ${sec('نقاط القوة', rep.strengths, '#16a34a')}
  ${sec('نقاط الضعف', rep.weaknesses, '#dc2626')}
  ${sec('التوصيات', rep.recommendations)}
  <div class="foot">أدوات التاجر — مساعد التاجر · خبراء المنصات · ${new Date().toLocaleDateString('ar-EG')}</div>
  </body></html>`;
}

async function renderStoreReportPdf(s) {
  let browser, puppeteer;
  try { puppeteer = require('puppeteer-core'); } catch { return null; }
  try {
    browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'], timeout: 30000 });
    const page = await browser.newPage();
    await page.setContent(buildHtml(s), { waitUntil: 'networkidle0', timeout: 20000 });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '8mm', right: '8mm' } });
    return pdf;
  } catch (e) {
    logger.warn('report-pdf fail: ' + (e.message || '').slice(0, 80));
    return null;
  } finally { if (browser) try { await browser.close(); } catch {} }
}

module.exports = { renderStoreReportPdf };
