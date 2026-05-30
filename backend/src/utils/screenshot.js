const puppeteer = require('puppeteer-core');
const logger = require('../logger');

const CHROME_PATH =
  process.env.CHROME_PATH ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-web-security',
  '--disable-features=VizDisplayCompositor',
];

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MOBILE_UA  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setupPage(page) {
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['font', 'media'].includes(req.resourceType())) return req.abort();
    req.continue();
  });
  page.setDefaultNavigationTimeout(20000);
}

async function snapPage(page, url, opts = {}) {
  const { width = 1440, height = 900, isMobile = false, ua = DESKTOP_UA, wait = 1200 } = opts;
  await page.setViewport({ width, height, isMobile, deviceScaleFactor: isMobile ? 2 : 1 });
  await page.setUserAgent(ua);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await delay(wait);
  return page.screenshot({
    type: 'jpeg',
    quality: 82,
    clip: { x: 0, y: 0, width, height },
    encoding: 'base64',
  });
}

async function takeStoreScreenshots(baseUrl) {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: LAUNCH_ARGS,
      timeout: 30000,
    });

    const origin = new URL(baseUrl).origin;
    const pages = [];

    // ── صفحة 1: الرئيسية — ديسكتوب + جوال + استخراج روابط داخلية ──────────
    const p1 = await browser.newPage();
    await setupPage(p1);

    const homeDesktop = await snapPage(p1, baseUrl, {
      width: 1440, height: 900, ua: DESKTOP_UA, wait: 1500,
    });

    // استخراج الروابط الداخلية من الصفحة
    const internalLinks = await p1.evaluate((origin) => {
      return [...document.querySelectorAll('a[href]')]
        .map(a => { try { return new URL(a.href, location.href).href; } catch { return ''; } })
        .filter(h =>
          h.startsWith(origin) &&
          !h.includes('#') &&
          h !== location.href &&
          h !== origin + '/' &&
          h.length > origin.length + 1
        )
        .slice(0, 20);
    }, origin);

    const homeMobile = await snapPage(p1, baseUrl, {
      width: 390, height: 844, isMobile: true, ua: MOBILE_UA, wait: 1000,
    });
    await p1.close();

    pages.push({
      label: 'الصفحة الرئيسية',
      url: baseUrl,
      desktop: homeDesktop,
      mobile: homeMobile,
    });

    // ── صفحة 2: منتج أو تصنيف ─────────────────────────────────────────────
    const extraUrl = internalLinks.find(l =>
      /product|item|منتج|collection|categor|تصنيف|قسم|shop|متجر|brand/i.test(l)
    );

    if (extraUrl) {
      try {
        const p2 = await browser.newPage();
        await setupPage(p2);
        const isProduct = /product|item|منتج/i.test(extraUrl);
        const label = isProduct ? 'صفحة منتج' : 'صفحة تصنيف / متجر';
        const extraDesktop = await snapPage(p2, extraUrl, {
          width: 1440, height: 900, ua: DESKTOP_UA, wait: 1000,
        });
        await p2.close();
        pages.push({ label, url: extraUrl, desktop: extraDesktop, mobile: null });
      } catch (e) {
        logger.warn(`Extra page screenshot failed: ${e.message}`);
      }
    }

    await browser.close();
    logger.info(`Screenshots: ${pages.length} pages for ${baseUrl}`);

    return {
      success: true,
      pages,
      desktop: pages[0].desktop,
      mobile:  pages[0].mobile,
    };

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    logger.warn(`Screenshot failed for ${baseUrl}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { takeStoreScreenshots };
