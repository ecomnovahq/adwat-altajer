const puppeteer = require('puppeteer-core');
const logger = require('../logger');
const { puppeteerProxyArgs, authenticatePage } = require('../proxy'); // بروكسي اختياري

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
    try { await require('../analyzer/store-scraper').assertPublicUrl(baseUrl); } // حماية SSRF
    catch (e) { return { success: false, error: e.message }; }
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [...puppeteerProxyArgs(), ...LAUNCH_ARGS, '--disable-blink-features=AutomationControlled'],
      timeout: 30000,
    });

    const origin = new URL(baseUrl).origin;
    const pages = [];

    // ── صفحة 1: الرئيسية — ديسكتوب + جوال + استخراج روابط داخلية ──────────
    const p1 = await browser.newPage();
    await authenticatePage(p1);
    // Bypass headless browser detection
    await p1.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
    });
    await setupPage(p1);

    // Step 1: Load page — use networkidle2 so we wait for dynamic API calls (Vue/React)
    await p1.setViewport({ width: 1440, height: 900 });
    await p1.setUserAgent(DESKTOP_UA);
    try {
      // networkidle2: wait until ≤2 concurrent requests for 500ms — catches dynamic content
      await p1.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 25000 });
    } catch (_) {
      // Fallback if networkidle2 times out (infinite background requests)
      await p1.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await delay(4000);
    }

    // Step 2: Viewport screenshot — captures above-the-fold design
    const homeDesktop = await p1.screenshot({
      type: 'jpeg', quality: 82,
      fullPage: false,
      encoding: 'base64',
    }).catch(() => null);

    // Step 3: Scroll to bottom to trigger footer lazy-loading, then wait for it
    await p1.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    }).catch(() => {});
    await delay(2000); // Wait for footer payment icons / social links to render

    // Step 4: Capture fully-rendered HTML including footer (payment methods, social, technologies)
    let renderedHtml = '';
    try { renderedHtml = await p1.content(); } catch (e) { /* non-fatal */ }

    await p1.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

    // Extract internal links for product page detection
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
    }, origin).catch(() => []);

    // Mobile screenshot
    await p1.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
    await p1.setUserAgent(MOBILE_UA);
    await p1.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await delay(1500);
    // Viewport mobile screenshot
    const homeMobile = await p1.screenshot({
      type: 'jpeg', quality: 78,
      fullPage: false,
      encoding: 'base64',
    }).catch(() => null);
    await p1.close();

    if (homeDesktop || homeMobile) {
      pages.push({
        label: 'الصفحة الرئيسية',
        url: baseUrl,
        desktop: homeDesktop || null,
        mobile:  homeMobile  || null,
      });
    }

    // ── صفحة 2: منتج أو تصنيف ─────────────────────────────────────────────
    const extraUrl = internalLinks.find(l =>
      /product|item|منتج|collection|categor|تصنيف|قسم|shop|متجر|brand/i.test(l)
    );

    if (extraUrl) {
      try {
        const p2 = await browser.newPage();
        await authenticatePage(p2);
        await setupPage(p2);
        const isProduct = /product|item|منتج/i.test(extraUrl);
        const label = isProduct ? 'صفحة منتج' : 'صفحة تصنيف / متجر';
        await p2.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
        await p2.setViewport({ width: 1440, height: 900 });
        await p2.setUserAgent(DESKTOP_UA);
        await p2.goto(extraUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(async () => {
          await p2.goto(extraUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
          await delay(2500);
        });
        const extraDesktop = await p2.screenshot({
          type: 'jpeg', quality: 80,
          fullPage: false,
          encoding: 'base64',
        }).catch(() => null);
        await p2.close();
        pages.push({ label, url: extraUrl, desktop: extraDesktop, mobile: null });
      } catch (e) {
        logger.warn(`Extra page screenshot failed: ${e.message}`);
      }
    }

    await browser.close();
    logger.info(`Screenshots: ${pages.length} pages for ${baseUrl}`);

    return {
      success: pages.length > 0,
      pages,
      desktop: pages[0]?.desktop || null,
      mobile:  pages[0]?.mobile  || null,
      renderedHtml,
    };

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    logger.warn(`Screenshot failed for ${baseUrl}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { takeStoreScreenshots };
