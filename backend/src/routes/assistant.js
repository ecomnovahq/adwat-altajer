const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const logger = require('../logger');
const { scrapeStoreFull, normUrl, fetchProduct } = require('../analyzer/store-scraper');
const { auditStore, auditPerformance } = require('../analyzer/store-audit');
const { aiJSON, aiChatText, aiText, aiImage } = require('../ai');
let sendMail; try { ({ sendMail } = require('../mailer')); } catch { sendMail = async () => {}; }

const ar = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const escapeHtml = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ─── تتبّع تقدّم المزامنة لحظياً (لكل مستخدم) — يُستعلم من الواجهة بالـpolling ───
const syncProgress = new Map(); // userId → { pct, label, ts, done }
function setProgress(userId, pct, label, done = false) {
  if (userId == null) return;
  syncProgress.set(userId, { pct: Math.max(0, Math.min(100, pct)), label: label || '', ts: Date.now(), done });
}

// ─── تحليل المتجر بالذكاء بناءً على ما سُحب ───────────────────────────────────
async function analyzeStore(scraped) {
  const prods = scraped.products || [];
  const productsLine = prods.slice(0, 40)
    .map(p => `- ${p.name}${p.price ? ` (${p.price} ${p.currency})` : ''}${p.category ? ` [قسم: ${p.category}]` : ''}${p.hasDescription ? '' : ' [بدون وصف]'}`).join('\n') || 'لم يتم العثور على منتجات عبر الزحف.';
  // إحصائيات دقيقة تُغذّى للذكاء
  const withDesc = prods.filter(p => p.hasDescription).length;
  const withImg = prods.filter(p => p.image).length;
  const prices = prods.map(p => parseFloat(p.price)).filter(v => !isNaN(v) && v > 0);
  const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const cats = scraped.menuCategories || [];
  const socials = Object.keys(scraped.socials || {});
  const prompt = `أنت مستشار متاجر إلكترونية خبير في السوق الخليجي. قيّم هذا المتجر بدقة بناءً على البيانات المسحوبة فقط — لا تخمّن ما لا تراه. اربط ملاحظاتك بالأرقام أدناه.

المتجر: ${scraped.storeName} | المنصة: ${scraped.platform} | الرابط: ${scraped.url}
الوصف: ${scraped.description || 'لا يوجد'}
الأقسام (${cats.length}): ${cats.join('، ') || 'لم تُكتشف أقسام'}
إجمالي المنتجات المكتشفة: ${scraped.productUrlsCount ?? prods.length} | حُلّلت تفاصيل: ${prods.length}
منتجات لها وصف: ${withDesc}/${prods.length} | لها صورة: ${withImg}/${prods.length} | متوسط السعر: ${avg || '—'} ر.س
الصفحات: ${scraped.pagesCount ?? 0} | منصات التواصل: ${socials.join('، ') || 'لا يوجد'}
عيّنة المنتجات:
${productsLine}

أعد JSON فقط:
{
"score": <0-100 تقييم عام واقعي>,
"summary": "<ملخّص حالة المتجر في جملتين>",
"strengths": ["<نقطة قوة>", "..."],
"weaknesses": ["<نقطة ضعف قابلة للتحسين>", "..."],
"recommendations": ["<توصية عملية محددة>", "..."],
"alerts": [{"type":"<seo|products|payment|content|trust>","severity":"<high|medium|low>","message":"<تنبيه واضح>"}]
}`;
  const r = await aiJSON(prompt, { temperature: 0.4, maxTokens: 3000 });
  return {
    score: Math.max(0, Math.min(100, parseInt(r.score) || 60)),
    summary: r.summary || '',
    strengths: Array.isArray(r.strengths) ? r.strengths : [],
    weaknesses: Array.isArray(r.weaknesses) ? r.weaknesses : [],
    recommendations: Array.isArray(r.recommendations) ? r.recommendations : [],
    alerts: Array.isArray(r.alerts) ? r.alerts : [],
  };
}

// تصنيف المنتجات ذكياً ضمن أقسام المتجر (عندما لا يوفّرها المتجر في بياناته)
async function aiCategorize(products, categories) {
  const cats = (categories || []).filter(Boolean).slice(0, 25);
  const items = products.filter(p => !p.category && p.name).slice(0, 120);
  if (!cats.length || !items.length) return;
  const norm = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim().toLowerCase();
  const catList = cats.map((c, i) => `${i}=${c}`).join(' | ');
  // معالجة على دفعات (25) لموثوقية أعلى
  for (let b = 0; b < items.length; b += 25) {
    const batch = items.slice(b, b + 25);
    try {
      const prompt = `لديك أقسام متجر مرقّمة: ${catList}
صنّف كل منتج برقم القسم الأنسب له. أعد كل سطر بالصيغة "رقم_المنتج=رقم_القسم" فقط، بدون أي شرح.
المنتجات:
${batch.map((p, i) => `${i}: ${p.name}`).join('\n')}`;
      const text = await aiText(prompt, { temperature: 0.2, maxTokens: 1500 });
      (text.match(/\d+\s*=\s*\d+/g) || []).forEach(pair => {
        const [pi, ci] = pair.split('=').map(x => parseInt(x.trim()));
        if (batch[pi] && cats[ci]) batch[pi].category = cats[ci];
      });
    } catch (e) { logger.warn('[aiCategorize] batch err: ' + e.message); }
  }
  logger.info(`[aiCategorize] cats=${cats.length} assigned=${items.filter(p => p.category).length}/${items.length}`);
}

// ─── المزامنة: سحب + تحليل + حفظ لقطة + تنبيهات (تُستخدم يدوياً وبالـcron) ───────
async function syncStore(store) {
  const limit = store.product_limit || 100;
  const pkey = store.id;
  setProgress(pkey, 3, 'بدء المزامنة…');
  // إعادة محاولة السحب مرتين عند فشل لحظي (شبكة/تزاحم المتصفّح)
  let scraped;
  for (let attempt = 0; ; attempt++) {
    try {
      scraped = await scrapeStoreFull(store.store_url, { limit, onProgress: (pct, label) => setProgress(pkey, pct, label) });
      break;
    }
    catch (e) {
      if (attempt >= 2) throw e;
      setProgress(pkey, 8, `تعذّر الاتصال — إعادة المحاولة (${attempt + 1})…`);
      logger.warn(`[assistant] sync retry ${attempt + 1}: ${(e.message || '').slice(0, 60)}`);
      await new Promise(r => setTimeout(r, 2500 * (attempt + 1)));
    }
  }

  // تصنيف ذكي للمنتجات الناقصة قسمها
  setProgress(pkey, 92, 'تصنيف المنتجات داخل الأقسام…');
  await aiCategorize(scraped.products, scraped.menuCategories);
  setProgress(pkey, 95, 'تحليل المتجر بالذكاء الاصطناعي…');
  // التحليل بالذكاء — لا يُفشل المزامنة إن تعثّر (نحفظ السحب دائماً)
  let report;
  try {
    report = await analyzeStore(scraped);
  } catch (e) {
    logger.warn('analyzeStore failed — fallback report: ' + e.message?.slice(0, 60));
    report = { score: store.latest_score || 60, summary: 'تم تحديث بيانات متجرك. تعذّر التحليل الذكي مؤقتاً، حاول المزامنة لاحقاً لتحديث التقييم.', strengths: [], weaknesses: [], recommendations: [], alerts: [], _aiFailed: true };
  }

  // فحص تقني للمتجر: طرق الدفع · SEO · تجربة · ثقة · أداء (Core Web Vitals)
  setProgress(pkey, 97, 'الفحص التقني (دفع/SEO/ثقة/أداء)…');
  let audit = null;
  try {
    audit = auditStore(scraped.html, scraped.url);
    audit.performance = await auditPerformance(scraped.url).catch(() => null);
    audit.overall = Math.round(
      [audit.payment.score, audit.seo.score, audit.ux.score, audit.trust.score, (audit.performance && audit.performance.score) || null]
        .filter(v => v != null).reduce((a, b, _, arr) => a + b / arr.length, 0)
    );
  } catch (e) { logger.warn('audit failed: ' + (e.message || '').slice(0, 60)); }

  // قارن بالتقييم السابق لتوليد تنبيه تغيّر
  const prevScore = store.latest_score;
  // الأقسام: من قائمة المتجر + تصنيفات المنتجات (الأشمل)
  const cats = [...new Set([...(scraped.menuCategories || []), ...scraped.products.map(p => (p.category || '').trim()).filter(Boolean)])].slice(0, 40);
  const pages = (scraped.pages || []).slice(0, 100);
  await db.query(
    `UPDATE merchant_stores SET store_name=$1, platform=$2, latest_score=$3, latest_report=$4, last_synced_at=NOW() WHERE id=$5`,
    [scraped.storeName, scraped.platform, report.score,
     JSON.stringify({ ...report, audit, productsCount: scraped.productUrlsCount ?? scraped.products.length, productLimit: scraped.productLimit ?? limit, pagesCount: scraped.pagesCount ?? 0, categories: cats, pages, socials: scraped.socials || {} }), store.id]
  );
  // حدّث المنتجات (استبدال — كل ما سُحب)
  await db.query('DELETE FROM store_products WHERE store_id=$1', [store.id]);
  for (const p of scraped.products) {
    const imgs = Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : []);
    await db.query(
      `INSERT INTO store_products (store_id,url,name,price,currency,image,images,description,category,has_description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [store.id, p.url, p.name, p.price, p.currency, p.image, JSON.stringify(imgs), p.description, p.category || null, !!p.hasDescription]
    ).catch(() => {});
  }
  // لقطة للتطوّر — مع مقاييس للمقارنة (قبل/بعد)
  const prods2 = scraped.products || [];
  const snapMetrics = {
    products: scraped.productUrlsCount ?? prods2.length,
    withDesc: prods2.filter(p => p.hasDescription).length,
    withImg: prods2.filter(p => p.image).length,
    categories: cats.length,
    pages: scraped.pagesCount ?? 0,
  };
  await db.query('INSERT INTO assistant_snapshots (store_id,score,report) VALUES ($1,$2,$3)',
    [store.id, report.score, JSON.stringify({ summary: report.summary, metrics: snapMetrics })]);

  // توليد تلقائي للأوصاف الناقصة (إن فعّله التاجر وضمن حدّ الباقة)
  if (store.auto_generate) {
    try {
      const guard = await aiQuotaGuard(store.user_id);
      if (!(guard instanceof Error)) {
        const room = guard.remaining === Infinity ? 20 : Math.min(20, guard.remaining);
        if (room > 0) {
          const missing = (await db.query(
            "SELECT id,name,category,description FROM store_products WHERE store_id=$1 AND (has_description=false OR description IS NULL OR description='') LIMIT $2",
            [store.id, room])).rows;
          for (const mp of missing) {
            try {
              const dsc = (await aiText(`اكتب وصفاً تسويقياً احترافياً (100-180 كلمة) للمنتج "${mp.name}"${mp.category ? ` (قسم: ${mp.category})` : ''} يخاطب المتسوّق الخليجي، بلا حشو، نص عربي مباشر فقط.`, { temperature: 0.7, maxTokens: 900 })).replace(/^```[\s\S]*?\n|```$/g, '').trim();
              if (dsc) { await saveProductField(mp.id, store.id, 'description', mp.description, dsc); await logGen(store.user_id, 'gen_description', { auto: true }); }
            } catch {}
          }
          logger.info(`[assistant] auto-generated ${missing.length} descriptions for store ${store.id}`);
        }
      }
    } catch (e) { /* غير حرج */ }
  }

  // خطة العمل: حوّل التوصيات إلى مهام قابلة للتتبّع (أضف الجديد فقط، احفظ المنجَز)
  try {
    const existing = (await db.query('SELECT text FROM store_tasks WHERE store_id=$1', [store.id])).rows.map(r => r.text);
    let order = existing.length;
    for (const rec of (report.recommendations || []).slice(0, 15)) {
      const t = String(rec || '').trim();
      if (t && !existing.includes(t)) {
        await db.query('INSERT INTO store_tasks (store_id,text,sort_order) VALUES ($1,$2,$3)', [store.id, t, order++]).catch(() => {});
      }
    }
  } catch (e) { /* غير حرج */ }

  // تنبيهات: من تحليل الذكاء + تغيّر التقييم + منتجات بلا وصف
  const alerts = [...report.alerts];
  if (typeof prevScore === 'number' && report.score <= prevScore - 5)
    alerts.push({ type: 'score', severity: 'high', message: `انخفض تقييم متجرك من ${prevScore} إلى ${report.score}. راجع التوصيات.` });
  const noDesc = scraped.products.filter(p => !p.hasDescription).length;
  if (noDesc > 0) alerts.push({ type: 'products', severity: 'medium', message: `${noDesc} منتج بدون وصف كافٍ — ولّد لها أوصافاً لرفع المبيعات والـSEO.` });
  const noImg = scraped.products.filter(p => !p.image).length;
  if (noImg > 0) alerts.push({ type: 'products', severity: 'low', message: `${noImg} منتج بدون صورة واضحة — أضف صوراً احترافية.` });
  // تنبيه تجاوز حدّ الباقة: المتجر فيه منتجات أكثر مما تسمح به الباقة
  const discovered = scraped.productUrlsCount ?? scraped.products.length;
  if (discovered > limit)
    alerts.push({ type: 'limit', severity: 'high', message: `متجرك يحتوي ${discovered} منتج لكن باقتك تحلّل ${limit} فقط. رقّ باقتك لتحليل كل المنتجات.` });
  // تنبيهات من الفحص التقني (محاور ضعيفة)
  if (audit) {
    const ax = [['payment', 'طرق الدفع'], ['seo', 'SEO والظهور في جوجل'], ['ux', 'تجربة المستخدم'], ['trust', 'الثقة والتوثيق'], ['performance', 'أداء الموقع']];
    for (const [k, lbl] of ax) {
      const sub = audit[k]; if (!sub || sub.score == null) continue;
      if (sub.score < 50) {
        const fix = (sub.issues && sub.issues[0]) ? ' — ' + sub.issues[0] : '';
        alerts.push({ type: 'audit', severity: sub.score < 30 ? 'high' : 'medium', message: `${lbl}: ضعيف (${sub.score}%)${fix}` });
      }
    }
  }
  // هدف التقييم
  if (store.target_score && report.score >= store.target_score)
    alerts.push({ type: 'goal', severity: 'low', message: `مبروك! وصلت لهدف التقييم (${store.target_score}). حدّد هدفاً أعلى للاستمرار.` });

  // مراقبة المنافسين المتابَعين (قسم «مراقبة المنافسين») — لقطة لكل منافس مع تخطّي المتكرّر خلال 12 ساعة
  try {
    const comps = (await db.query('SELECT * FROM competitors WHERE store_id=$1 ORDER BY id ASC LIMIT 5', [store.id])).rows;
    // توافق خلفي: رابط منافس قديم محفوظ في الإعدادات → أضِفه للقائمة
    if (!comps.length && store.competitor_url) {
      const ins = (await db.query('INSERT INTO competitors (store_id,url) VALUES ($1,$2) RETURNING *', [store.id, store.competitor_url])).rows[0];
      if (ins) comps.push(ins);
    }
    for (const c of comps) {
      const recent = (await db.query("SELECT created_at FROM competitor_snapshots WHERE competitor_id=$1 AND created_at > NOW() - INTERVAL '12 hours' LIMIT 1", [c.id])).rows[0];
      if (recent) continue; // لقطة حديثة موجودة — لا تُعِد السحب
      try {
        const comp = await scrapeStoreFull(c.url, { limit: 40 });
        const cProducts = comp.productUrlsCount ?? (comp.products || []).length;
        const prev = (await db.query('SELECT products FROM competitor_snapshots WHERE competitor_id=$1 ORDER BY id DESC LIMIT 1', [c.id])).rows[0];
        if (!c.name && comp.storeName) await db.query('UPDATE competitors SET name=$1 WHERE id=$2', [comp.storeName.slice(0, 250), c.id]).catch(() => {});
        await db.query('INSERT INTO competitor_snapshots (store_id,competitor_id,name,products,categories) VALUES ($1,$2,$3,$4,$5)',
          [store.id, c.id, (comp.storeName || c.name || '').slice(0, 250), cProducts, (comp.menuCategories || []).length]).catch(() => {});
        if (prev && cProducts > prev.products)
          alerts.push({ type: 'competitor', severity: 'medium', message: `منافسك «${comp.storeName || c.name || ''}» أضاف ${cProducts - prev.products} منتج جديد. تابع تحرّكاته.` });
      } catch (e) { /* غير حرج */ }
    }
  } catch (e) { /* غير حرج */ }

  // امسح تنبيهات المزامنة السابقة لتفادي التكرار والتراكم (تنبيهات كل مزامنة تعكس الحالة الحالية)
  await db.query('DELETE FROM store_alerts WHERE store_id=$1', [store.id]).catch(() => {});
  for (const a of alerts.slice(0, 12)) {
    await db.query('INSERT INTO store_alerts (store_id,type,severity,message) VALUES ($1,$2,$3,$4)',
      [store.id, a.type || 'info', a.severity || 'info', a.message || '']).catch(() => {});
  }

  // تنبيه بريدي فوري عند هبوط التقييم ≥5 أو وجود تنبيه حرج
  try {
    const critical = alerts.find(a => a.severity === 'high');
    if ((typeof prevScore === 'number' && report.score <= prevScore - 5) || critical) {
      const u = (await db.query('SELECT name,email FROM users WHERE id=$1', [store.user_id])).rows[0];
      if (u?.email) {
        const html = `<div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:1.9;color:#1a1a2e;">
          <h2 style="color:#6d28d9;">تنبيه من مساعد التاجر — ${escapeHtml(store.store_name || 'متجرك')}</h2>
          ${typeof prevScore === 'number' && report.score <= prevScore - 5 ? `<p style="color:#dc2626;font-weight:700;">⚠ انخفض تقييم متجرك من ${prevScore} إلى ${report.score}.</p>` : ''}
          ${critical ? `<p><span style="color:#dc2626;font-weight:700;">●</span> ${escapeHtml(critical.message)}</p>` : ''}
          <p>افتح مساعد التاجر لمراجعة التوصيات وخطة التحسين.</p></div>`;
        sendMail({ to: u.email, subject: `تنبيه متجرك — مساعد التاجر`, html }).catch(() => {});
      }
    }
  } catch (e) { /* غير حرج */ }

  setProgress(pkey, 100, 'اكتملت المزامنة ✓', true);
  return { report, productsCount: scraped.products.length };
}

async function getMyStore(userId) {
  const { rows } = await db.query('SELECT * FROM merchant_stores WHERE user_id=$1 ORDER BY id ASC LIMIT 1', [userId]);
  return rows[0] || null;
}
// كل متاجر العميل (تعدّد المتاجر)
async function getMyStores(userId) {
  const { rows } = await db.query('SELECT * FROM merchant_stores WHERE user_id=$1 ORDER BY id ASC', [userId]);
  return rows;
}
// متجر محدّد بالـid مع التحقق من الملكية، أو المتجر الأول إن لم يُحدّد
async function resolveStore(userId, storeId) {
  if (storeId) {
    const { rows } = await db.query('SELECT * FROM merchant_stores WHERE id=$1 AND user_id=$2', [storeId, userId]);
    return rows[0] || null;
  }
  return getMyStore(userId);
}
// الحد الأقصى للمتاجر المسموح به للعميل
async function getMaxStores(userId) {
  const { rows } = await db.query('SELECT max_stores FROM users WHERE id=$1', [userId]);
  return Math.max(1, rows[0]?.max_stores || 1);
}
const reqStoreId = req => req.body?.storeId || req.query?.storeId || null;

// ─── حدّ استخدام الذكاء حسب الباقة (شهرياً) ───────────────────────────────────
const GEN_ACTIONS = ['gen_description', 'gen_seo', 'gen_bullets', 'gen_campaign', 'fix_gaps', 'bulk_description', 'bulk_seo'];
async function aiUsedThisMonth(userId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS n FROM tool_logs WHERE user_id=$1 AND tool_name='assistant'
     AND created_at >= date_trunc('month', now()) AND (input_data->>'action') = ANY($2)`,
    [userId, GEN_ACTIONS]);
  return rows[0]?.n || 0;
}
async function getAiQuota(userId) {
  const { rows } = await db.query('SELECT ai_quota FROM users WHERE id=$1', [userId]);
  return rows[0]?.ai_quota ?? 300;
}
// يُرجع Error إن تجاوز الحد (للتعامل معه في المسار) أو {quota,used,remaining}
async function aiQuotaGuard(userId) {
  const quota = await getAiQuota(userId);
  if (quota <= 0) return { quota: 0, used: 0, remaining: Infinity }; // 0 = غير محدود
  const used = await aiUsedThisMonth(userId);
  if (used >= quota) { const e = new Error(`وصلت لحدّ استخدام الذكاء في باقتك هذا الشهر (${quota} عملية). رقّ باقتك للمزيد.`); e.status = 429; return e; }
  return { quota, used, remaining: quota - used };
}
async function logGen(userId, action, extra) {
  await db.query('INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
    [userId, 'assistant', { action, ...(extra || {}) }, { ok: true }]).catch(() => {});
}

// ─── إضافة/ربط متجر (مع مزامنة أولية) ─────────────────────────────────────────
router.post('/store', auth, ar(async (req, res) => {
  const url = normUrl(req.body.url || '');
  if (!url) return res.status(400).json({ error: 'أدخل رابط متجر صحيح' });
  const stores = await getMyStores(req.user.id);
  // إن كان الرابط موجوداً لدى العميل → حدّثه وأعد مزامنته (لا يُحتسب متجراً جديداً)
  let store = stores.find(s => normUrl(s.store_url) === url);
  if (!store) {
    const max = await getMaxStores(req.user.id);
    if (stores.length >= max)
      return res.status(403).json({ error: `وصلت للحد الأقصى لعدد المتاجر في باقتك (${max}). احذف متجراً أو رقّ باقتك لإضافة المزيد.` });
    const { rows } = await db.query(
      'INSERT INTO merchant_stores (user_id,store_url) VALUES ($1,$2) RETURNING *', [req.user.id, url]);
    store = rows[0];
  } else {
    await db.query('UPDATE merchant_stores SET store_url=$1 WHERE id=$2', [url, store.id]);
    store.store_url = url;
  }
  try {
    await syncStore(store);
    await db.query('INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
      [req.user.id, 'assistant', { action: 'add_store', url }, { ok: true }]).catch(() => {});
    res.json({ ok: true, storeId: store.id, store: await resolveStore(req.user.id, store.id) });
  } catch (e) {
    setProgress(store.id, 100, 'تعذّر الوصول للمتجر', true);
    logger.error('assistant sync error: ' + e.message);
    res.status(502).json({ error: 'تعذّر الوصول للمتجر. تأكد أن الرابط صحيح ويفتح للعامة.' });
  }
}));

// حالة/بيانات المتجر (تعدّد المتاجر: يعيد قائمة المتاجر + المتجر النشط)
router.get('/store', auth, ar(async (req, res) => {
  const all = await getMyStores(req.user.id);
  const maxStores = await getMaxStores(req.user.id);
  const stores = all.map(s => ({ id: s.id, store_name: s.store_name, store_url: s.store_url, platform: s.platform, latest_score: s.latest_score, last_synced_at: s.last_synced_at, product_limit: s.product_limit }));
  if (!all.length) return res.json({ store: null, stores: [], maxStores });
  const store = await resolveStore(req.user.id, reqStoreId(req)) || all[0];
  const products = (await db.query('SELECT id,url,name,price,currency,image,images,category,description,has_description,seo,bullets FROM store_products WHERE store_id=$1 ORDER BY id DESC LIMIT 300', [store.id])).rows;
  const snapshots = (await db.query('SELECT score,report,created_at FROM assistant_snapshots WHERE store_id=$1 ORDER BY created_at ASC LIMIT 30', [store.id])).rows;
  const alerts = (await db.query('SELECT id,type,severity,message,seen,created_at FROM store_alerts WHERE store_id=$1 ORDER BY created_at DESC LIMIT 20', [store.id])).rows;
  const adminInsights = (await db.query('SELECT id,kind,title,body,pinned,created_at FROM store_admin_insights WHERE store_id=$1 ORDER BY pinned DESC, created_at DESC LIMIT 20', [store.id])).rows;
  const rep = store.latest_report || {};
  res.json({ store, activeStoreId: store.id, stores, maxStores, products, snapshots, alerts, adminInsights, categories: rep.categories || [], pages: rep.pages || [], socials: rep.socials || {}, productLimit: store.product_limit || rep.productLimit || 100 });
}));

// مزامنة يدوية
router.post('/sync', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'لم تُضف متجراً بعد' });
  try {
    const r = await syncStore(store);
    await db.query('INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
      [req.user.id, 'assistant', { action: 'sync' }, { ok: true }]).catch(() => {});
    res.json({ ok: true, ...r, store: await resolveStore(req.user.id, store.id) });
  } catch (e) { setProgress(store.id, 100, 'تعذّرت المزامنة', true); res.status(502).json({ error: 'تعذّرت المزامنة. حاول لاحقاً.' }); }
}));

// تقدّم المزامنة اللحظي (polling) — يعكس مرحلة السحب/التحليل الفعلية (لكل متجر)
router.get('/sync/progress', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  const p = (store && syncProgress.get(store.id)) || { pct: 0, label: '', done: true };
  res.json(p);
}));

// حذف المتجر
router.delete('/store', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (store) {
    await Promise.all([
      db.query('DELETE FROM store_products WHERE store_id=$1', [store.id]),
      db.query('DELETE FROM assistant_snapshots WHERE store_id=$1', [store.id]),
      db.query('DELETE FROM store_alerts WHERE store_id=$1', [store.id]),
      db.query('DELETE FROM store_tasks WHERE store_id=$1', [store.id]),
      db.query('DELETE FROM product_revisions WHERE store_id=$1', [store.id]),
      db.query('DELETE FROM assistant_chats WHERE store_id=$1', [store.id]),
    ]);
    await db.query('DELETE FROM merchant_stores WHERE id=$1', [store.id]);
  }
  res.json({ ok: true });
}));

// تعليم التنبيهات كمقروءة
router.post('/alerts/seen', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (store) await db.query('UPDATE store_alerts SET seen=true WHERE store_id=$1', [store.id]);
  res.json({ ok: true });
}));

// إعدادات المتجر: هدف التقييم + التوليد التلقائي + رابط المنافس للمتابعة
router.post('/settings', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'لا متجر' });
  const sets = [], vals = []; let i = 1;
  if ('targetScore' in req.body) { const t = parseInt(req.body.targetScore); sets.push(`target_score=$${i++}`); vals.push(isNaN(t) ? null : Math.max(0, Math.min(100, t))); }
  if ('autoGenerate' in req.body) { sets.push(`auto_generate=$${i++}`); vals.push(!!req.body.autoGenerate); }
  if ('competitorUrl' in req.body) { sets.push(`competitor_url=$${i++}`); vals.push(normUrl(req.body.competitorUrl) || null); }
  if (!sets.length) return res.json({ ok: true });
  vals.push(store.id);
  await db.query(`UPDATE merchant_stores SET ${sets.join(', ')} WHERE id=$${i}`, vals);
  res.json({ ok: true, store: await resolveStore(req.user.id, store.id) });
}));

// خط زمني للمنافس
router.get('/competitor-timeline', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.json({ url: null, snapshots: [] });
  const snapshots = (await db.query('SELECT name,products,categories,created_at FROM competitor_snapshots WHERE store_id=$1 ORDER BY created_at ASC LIMIT 30', [store.id])).rows;
  res.json({ url: store.competitor_url || null, snapshots });
}));

// ─── مراقبة المنافسين (قسم مستقل) ────────────────────────────────────────────
// قائمة المنافسين المتابَعين + خط زمني لكل منافس
router.get('/competitors', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.json({ competitors: [] });
  const comps = (await db.query('SELECT id,url,name,created_at FROM competitors WHERE store_id=$1 ORDER BY id ASC', [store.id])).rows;
  const out = [];
  for (const c of comps) {
    const snaps = (await db.query('SELECT name,products,categories,created_at FROM competitor_snapshots WHERE competitor_id=$1 ORDER BY created_at ASC LIMIT 30', [c.id])).rows;
    const last = snaps[snaps.length - 1] || null;
    const first = snaps[0] || null;
    out.push({
      id: c.id, url: c.url, name: c.name || (last && last.name) || c.url,
      createdAt: c.created_at,
      products: last ? last.products : null,
      categories: last ? last.categories : null,
      delta: (first && last) ? (last.products - first.products) : 0,
      snapshots: snaps,
    });
  }
  res.json({ competitors: out });
}));

// إضافة منافس جديد للمتابعة (يسحب لقطة أولية فوراً)
router.post('/competitors', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'أضف متجرك أولاً' });
  const url = normUrl(req.body.url || '');
  if (!url) return res.status(400).json({ error: 'رابط غير صالح' });
  const count = parseInt((await db.query('SELECT COUNT(*)::int n FROM competitors WHERE store_id=$1', [store.id])).rows[0].n) || 0;
  if (count >= 5) return res.status(400).json({ error: 'الحد الأقصى 5 منافسين للمتابعة' });
  const dup = (await db.query('SELECT id FROM competitors WHERE store_id=$1 AND url=$2', [store.id, url])).rows[0];
  if (dup) return res.status(400).json({ error: 'هذا المنافس متابَع بالفعل' });
  const comp = (await db.query('INSERT INTO competitors (store_id,url) VALUES ($1,$2) RETURNING id,url,name,created_at', [store.id, url])).rows[0];
  // لقطة أولية فورية (غير حرجة لو فشلت)
  try {
    const sc = await scrapeStoreFull(url, { limit: 40 });
    const cProducts = sc.productUrlsCount ?? (sc.products || []).length;
    if (sc.storeName) await db.query('UPDATE competitors SET name=$1 WHERE id=$2', [sc.storeName.slice(0, 250), comp.id]).catch(() => {});
    await db.query('INSERT INTO competitor_snapshots (store_id,competitor_id,name,products,categories) VALUES ($1,$2,$3,$4,$5)',
      [store.id, comp.id, (sc.storeName || '').slice(0, 250), cProducts, (sc.menuCategories || []).length]).catch(() => {});
    comp.name = sc.storeName || comp.url;
    comp.products = cProducts;
    comp.categories = (sc.menuCategories || []).length;
  } catch (e) { /* غير حرج */ }
  res.json({ ok: true, competitor: comp });
}));

// إلغاء متابعة منافس
router.delete('/competitors/:id', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'لا متجر' });
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'معرّف غير صالح' });
  await db.query('DELETE FROM competitor_snapshots WHERE competitor_id=$1 AND store_id=$2', [id, store.id]);
  await db.query('DELETE FROM competitors WHERE id=$1 AND store_id=$2', [id, store.id]);
  res.json({ ok: true });
}));

// ─── شات المساعد (سياق المتجر + سجل + رفع تقارير/صور) ─────────────────────────
router.post('/chat', auth, ar(async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 4000);
  const attachText = String(req.body.attachmentText || '').trim().slice(0, 12000); // نص تقرير مرفق
  const images = Array.isArray(req.body.images) ? req.body.images : [];
  if (!message && !attachText && !images.length) return res.status(400).json({ error: 'اكتب رسالة' });

  const store = await resolveStore(req.user.id, reqStoreId(req));
  const sid = store ? store.id : null;
  let ctx = 'لم يضف التاجر متجره بعد — شجّعه على إضافته ليصبح تحليلك دقيقاً.';
  if (store) {
    const rep = store.latest_report || {};
    const prods = (await db.query('SELECT name,price,currency,category,has_description,image,images,seo FROM store_products WHERE store_id=$1 LIMIT 120', [store.id])).rows;
    const noDesc = prods.filter(p => !p.has_description).length;
    const noImg = prods.filter(p => !p.image && !(Array.isArray(p.images) && p.images.length)).length;
    const noSeo = prods.filter(p => !p.seo).length;
    const noCat = prods.filter(p => !p.category).length;
    ctx = `متجر التاجر: ${store.store_name} | المنصة: ${store.platform} | الرابط: ${store.store_url}
التقييم الحالي: ${store.latest_score ?? '—'}/100
إجمالي المنتجات: ${rep.productsCount ?? prods.length} | الصفحات: ${rep.pagesCount ?? '—'} | الأقسام: ${(rep.categories || []).length}
فجوات قابلة للإصلاح: ${noDesc} بلا وصف · ${noImg} بلا صورة · ${noSeo} بلا SEO · ${noCat} بلا قسم
ملخّص: ${rep.summary || ''}
نقاط القوة: ${(rep.strengths || []).join('، ')}
نقاط الضعف: ${(rep.weaknesses || []).join('، ')}
التوصيات: ${(rep.recommendations || []).join('، ')}
قائمة المنتجات (عيّنة): ${prods.slice(0, 60).map(p => p.name + (p.price ? ` (${p.price} ${p.currency || ''})` : '') + (p.category ? ` [${p.category}]` : '') + (p.has_description ? '' : ' [بلا وصف]')).join(' | ')}`;
    // تحليل الخبير البشري (من فريق المنصة) — اعتمد عليه فهو دقيق وموثوق
    const ins = (await db.query('SELECT kind,title,body FROM store_admin_insights WHERE store_id=$1 ORDER BY pinned DESC, created_at DESC LIMIT 15', [store.id])).rows;
    if (ins.length) {
      const kindAr = { insight: 'ملاحظة', recommendation: 'توصية', warning: 'تحذير', opportunity: 'فرصة' };
      ctx += `\n\nتحليل خبراء المنصة لهذا المتجر (مصدر موثوق — راعِه في كل ردودك واستشهد به عند المناسبة):\n` +
        ins.map(x => `- [${kindAr[x.kind] || 'ملاحظة'}] ${x.title ? x.title + ': ' : ''}${x.body}`).join('\n');
    }
  }

  const system = `أنت «مساعد التاجر» — مساعد شخصي ذكي لمتجر إلكتروني خليجي.
شخصيتك: ودود ومحترم، **دقيق جداً**، و**مختصر**.
أسلوب الردّ (إلزامي):
- ردود قصيرة ومركّزة: ٣-٦ أسطر كحدّ أقصى، أو نقاط مرقّمة موجزة. لا مقدمات ولا حشو ولا تكرار.
- ادخل في صلب الإجابة مباشرة. جملة ترحيب واحدة فقط أول محادثة.
- استند **حصراً** إلى بيانات متجر التاجر أدناه — لا تخترع أرقاماً أو منتجات غير موجودة. إن لم تكن المعلومة متوفرة، قل ذلك باختصار واسأل سؤالاً واحداً.
- كل نصيحة عملية وقابلة للتنفيذ فوراً.

سياق متجر التاجر:
${ctx}
${attachText ? `\nالتاجر أرفق تقريراً لتحليله:\n"""${attachText}"""\nلخّص أهم ٣ نقاط + توصية واحدة، باختصار.` : ''}

إذا طلب التاجر التحدث مع خدمة العملاء أو فريق بشري أو حلّ مشكلة تحتاج تدخّل الفريق: طمئنه بجملة قصيرة أنه يمكنه فتح تذكرة دعم مباشرة من زر «تواصل مع خدمة العملاء» بالأسفل، وسيردّ عليه الفريق بأولوية.`;

  // سجل آخر رسائل (لكل متجر على حدة)
  const hist = (await db.query('SELECT role,content FROM assistant_chats WHERE user_id=$1 AND (store_id=$2 OR ($2 IS NULL AND store_id IS NULL)) ORDER BY id DESC LIMIT 10', [req.user.id, sid])).rows.reverse();

  // صور مرفقة → Vision
  const imageParts = images.slice(0, 3).map(img => {
    const m = String(img).match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!m) return null;
    return { inlineData: { mimeType: m[1], data: m[2] } };
  }).filter(Boolean);

  const userMsg = message || (attachText ? 'حلّل التقرير المرفق وأعطني أهم التوصيات.' : 'حلّل الصورة المرفقة.');

  // ── شات يتفاعل بأفعال: «حسّن وصف منتج كذا» → ينفّذها مباشرة ──
  const actMatch = store && userMsg.match(/(?:حسّ?ن|اكتب|ولّ?د|أنشئ)\s+(?:لي\s+)?(?:وصف|الوصف)\s+(?:منتج|لمنتج|ل)?\s*[:：]?\s*(.{2,80})/);
  if (actMatch) {
    const q = actMatch[1].replace(/["'؟?.]/g, '').trim();
    const prod = (await db.query(
      `SELECT id,name,category,price,currency,description FROM store_products WHERE store_id=$1 AND name ILIKE $2 ORDER BY length(name) ASC LIMIT 1`,
      [store.id, '%' + q + '%'])).rows[0];
    if (prod) {
      try {
        const dp = `اكتب وصفاً تسويقياً احترافياً (120-200 كلمة) للمنتج "${prod.name}"${prod.category ? ` (قسم: ${prod.category})` : ''} يخاطب المتسوّق الخليجي، بلا عبارات مبتذلة، نص عربي مباشر فقط.`;
        const desc = (await aiText(dp, { temperature: 0.75, maxTokens: 900 })).replace(/^```[\s\S]*?\n|```$/g, '').trim();
        if (desc) {
          await saveProductField(prod.id, store.id, 'description', prod.description, desc);
          const reply2 = `تم — حسّنت وصف «${prod.name}» وحفظته:\n\n${desc}`;
          await db.query('INSERT INTO assistant_chats (user_id,store_id,role,content) VALUES ($1,$2,$3,$4)', [req.user.id, sid, 'user', userMsg.slice(0, 2000)]).catch(() => {});
          await db.query('INSERT INTO assistant_chats (user_id,store_id,role,content) VALUES ($1,$2,$3,$4)', [req.user.id, sid, 'assistant', reply2.slice(0, 4000)]).catch(() => {});
          await db.query('INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)', [req.user.id, 'assistant', { action: 'chat_improve', product: prod.name }, { ok: true }]).catch(() => {});
          return res.json({ reply: reply2, offerSupport: false, action: 'improved_description' });
        }
      } catch (e) { /* اسقط للرد العادي */ }
    }
  }

  let reply;
  try {
    reply = await aiChatText(system, hist, userMsg, imageParts);
  } catch (e) {
    logger.error('assistant chat error: ' + e.message);
    return res.status(502).json({ error: 'تعذّر الرد الآن، حاول مجدداً.' });
  }
  // خزّن المحادثة
  await db.query('INSERT INTO assistant_chats (user_id,store_id,role,content) VALUES ($1,$2,$3,$4)', [req.user.id, sid, 'user', userMsg.slice(0, 2000)]).catch(() => {});
  await db.query('INSERT INTO assistant_chats (user_id,store_id,role,content) VALUES ($1,$2,$3,$4)', [req.user.id, sid, 'assistant', reply.slice(0, 4000)]).catch(() => {});
  // سجّل الاستخدام (يظهر في إحصائيات لوحة التحكم وسجل العميل مثل بقية الأدوات)
  await db.query('INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
    [req.user.id, 'assistant', { action: 'chat', message: userMsg.slice(0, 120) }, { ok: true }]).catch(() => {});
  // كشف نية التواصل مع خدمة العملاء → اقترح فتح تذكرة
  const offerSupport = /خدمة العملاء|الدعم|أتواصل|اتواصل|تواصل مع|مشكلة|شكوى|موظف|بشري|أحد من الفريق|احد من الفريق|اكلم حد|أكلم حد/.test(userMsg);
  res.json({ reply, offerSupport });
}));

// سجل المحادثة (لكل متجر)
router.get('/chat', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  const sid = store ? store.id : null;
  const rows = (await db.query('SELECT role,content,created_at FROM assistant_chats WHERE user_id=$1 AND (store_id=$2 OR ($2 IS NULL AND store_id IS NULL)) ORDER BY id ASC LIMIT 100', [req.user.id, sid])).rows;
  res.json(rows);
}));

// مسح المحادثة (لكل متجر)
router.delete('/chat', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  const sid = store ? store.id : null;
  await db.query('DELETE FROM assistant_chats WHERE user_id=$1 AND (store_id=$2 OR ($2 IS NULL AND store_id IS NULL))', [req.user.id, sid]);
  res.json({ ok: true });
}));

// ─── أدوات لكل منتج: تحسين الوصف / SEO / ضغط الصورة ───────────────────────────
async function getMyProduct(userId, pid) {
  const { rows } = await db.query(
    `SELECT p.* FROM store_products p JOIN merchant_stores s ON s.id=p.store_id WHERE p.id=$1 AND s.user_id=$2`,
    [pid, userId]);
  return rows[0] || null;
}
// حفظ تعديل على وصف المنتج + تسجيله في سجل التغييرات (قبل/بعد)
async function saveProductField(productId, storeId, field, before, after) {
  await db.query('UPDATE store_products SET description=$1, has_description=true, updated_at=NOW() WHERE id=$2', [after, productId]).catch(() => {});
  await db.query('INSERT INTO product_revisions (product_id,store_id,field,before_val,after_val) VALUES ($1,$2,$3,$4,$5)',
    [productId, storeId, field, (before || '').slice(0, 4000), (after || '').slice(0, 4000)]).catch(() => {});
}

// تحسين وصف منتج (يُرجع الوصف ويحفظه)
router.post('/product/:id/description', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  const q = await aiQuotaGuard(req.user.id); if (q instanceof Error) return res.status(q.status).json({ error: q.message });
  const en = req.body.lang === 'en';
  const prompt = en
    ? `You are a professional e-commerce copywriter. Write a compelling product description (120-200 words) in clear English for international/tourist shoppers. No clichés ("high quality", "the best"); every sentence adds a real benefit.
Product: ${p.name}${p.category ? ` | Category: ${p.category}` : ''}${p.price ? ` | Price: ${p.price} ${p.currency || ''}` : ''}
${p.description ? `Current (Arabic) description: ${String(p.description).replace(/<[^>]+>/g, '').slice(0, 400)}` : ''}
Write the description directly as plain English text only — no headings, markup or JSON.`
    : `أنت كاتب محتوى منتجات خليجي محترف. اكتب وصفاً تسويقياً احترافياً (120-220 كلمة) للمنتج التالي، يخاطب المتسوّق الخليجي، بلا عبارات مبتذلة ("جودة عالية"، "الأفضل")، كل جملة بمعلومة وفائدة.
المنتج: ${p.name}${p.category ? ` | التصنيف: ${p.category}` : ''}${p.price ? ` | السعر: ${p.price} ${p.currency || ''}` : ''}
${p.description ? `الوصف الحالي: ${String(p.description).replace(/<[^>]+>/g, '').slice(0, 400)}` : ''}
اكتب الوصف مباشرة كنص عربي فقط — بدون عناوين أو علامات أو JSON.`;
  const description = (await aiText(prompt, { temperature: 0.75, maxTokens: 1200 })).replace(/^```[\s\S]*?\n|```$/g, '').trim();
  await logGen(req.user.id, 'gen_description', { product: p.name, lang: en ? 'en' : 'ar' });
  // لا نحفظ تلقائياً — العميل يراجع ثم يعتمد عبر /apply
  res.json({ description, lang: en ? 'en' : 'ar' });
}));

// مساعد تسعير ذكي — يقترح سعراً بناءً على متوسط القسم + المنافس + الهامش
router.post('/product/:id/price-suggestion', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  const q = await aiQuotaGuard(req.user.id); if (q instanceof Error) return res.status(q.status).json({ error: q.message });
  // إحصاء أسعار القسم
  const peers = (await db.query('SELECT price FROM store_products WHERE store_id=$1 AND category=$2 AND price IS NOT NULL', [p.store_id, p.category || ''])).rows
    .map(r => parseFloat(r.price)).filter(v => !isNaN(v) && v > 0);
  const avg = peers.length ? Math.round(peers.reduce((a, b) => a + b, 0) / peers.length) : null;
  const min = peers.length ? Math.min(...peers) : null, max = peers.length ? Math.max(...peers) : null;
  const cost = parseFloat(req.body.cost); const hasCost = !isNaN(cost) && cost > 0;
  const prompt = `أنت مستشار تسعير لمتاجر التجزئة الخليجية. اقترح سعر بيع مناسباً لهذا المنتج.
المنتج: ${p.name}${p.category ? ` | القسم: ${p.category}` : ''} | السعر الحالي: ${p.price || 'غير محدّد'} ${p.currency || 'ر.س'}
إحصاء أسعار نفس القسم: متوسط ${avg ?? '—'} | أدنى ${min ?? '—'} | أعلى ${max ?? '—'} (عدد ${peers.length})
${hasCost ? `تكلفة المنتج: ${cost} ر.س (راعِ هامش ربح صحي 30-60%).` : ''}
أعد JSON فقط: {"suggested":<رقم السعر المقترح>,"reasoning":"<سبب موجز بجملتين>","position":"<اقتصادي/متوسط/مميز>"}`;
  let r; try { r = await aiJSON(prompt, { temperature: 0.4, maxTokens: 700 }); } catch { r = {}; }
  await logGen(req.user.id, 'gen_seo', { price: p.id });
  res.json({ suggested: r.suggested ?? null, reasoning: r.reasoning || '', position: r.position || '', stats: { avg, min, max, count: peers.length } });
}));

// اعتماد وصف منتج (حفظ + تسجيل في سجل التغييرات)
router.post('/product/:id/apply', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  const description = String(req.body.description || '').trim().slice(0, 6000);
  if (!description) return res.status(400).json({ error: 'لا يوجد وصف' });
  await saveProductField(p.id, p.store_id, 'description', p.description, description);
  await db.query('INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
    [req.user.id, 'assistant', { action: 'apply_description', product: p.name }, { ok: true }]).catch(() => {});
  res.json({ ok: true });
}));

// نقاط بيع سريعة (Bullets) — تُحفظ في bullets
router.post('/product/:id/bullets', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  const q = await aiQuotaGuard(req.user.id); if (q instanceof Error) return res.status(q.status).json({ error: q.message });
  const prompt = `اكتب 5 نقاط بيع قصيرة ومقنعة (Bullets) للمنتج "${p.name}"${p.category ? ` (قسم: ${p.category})` : ''} تخاطب المتسوّق الخليجي، كل نقطة بفائدة ملموسة بلا حشو.
أعد JSON فقط: {"bullets":["<نقطة>","<نقطة>","<نقطة>","<نقطة>","<نقطة>"]}`;
  const r = await aiJSON(prompt, { temperature: 0.6, maxTokens: 800 });
  const bullets = Array.isArray(r.bullets) ? r.bullets.slice(0, 8) : [];
  if (bullets.length) await db.query('UPDATE store_products SET bullets=$1 WHERE id=$2', [JSON.stringify(bullets), p.id]).catch(() => {});
  await logGen(req.user.id, 'gen_bullets', { product: p.name });
  res.json({ bullets });
}));

// سجل تغييرات المنتج
router.get('/product/:id/history', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  const revisions = (await db.query('SELECT field,before_val,after_val,created_at FROM product_revisions WHERE product_id=$1 ORDER BY id DESC LIMIT 20', [p.id])).rows;
  res.json({ revisions });
}));

// شات في سياق منتج محدّد
router.post('/product/:id/chat', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  const message = String(req.body.message || '').trim().slice(0, 1000);
  if (!message) return res.status(400).json({ error: 'اكتب سؤالك' });
  const system = `أنت «مساعد التاجر» تساعد تاجراً خليجياً في منتج محدّد من متجره. ردّ دقيق ومختصر (٣-٦ أسطر) وعملي.
المنتج: ${p.name}${p.category ? ` | القسم: ${p.category}` : ''}${p.price ? ` | السعر: ${p.price} ${p.currency || ''}` : ''}
${p.description ? `الوصف الحالي: ${String(p.description).replace(/<[^>]+>/g, '').slice(0, 600)}` : 'لا يوجد وصف محفوظ.'}`;
  let reply;
  try { reply = await aiChatText(system, [], message, []); }
  catch (e) { return res.status(502).json({ error: 'تعذّر الرد الآن.' }); }
  await db.query('INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
    [req.user.id, 'assistant', { action: 'product_chat', product: p.name }, { ok: true }]).catch(() => {});
  res.json({ reply });
}));

// تحسين SEO لمنتج (عنوان + ميتا + وسوم) — يُحفظ في seo
router.post('/product/:id/seo', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  const q = await aiQuotaGuard(req.user.id); if (q instanceof Error) return res.status(q.status).json({ error: q.message });
  const prompt = `أنت خبير SEO عربي لمتاجر سلة وزد. حسّن SEO للمنتج التالي.
المنتج: ${p.name}${p.category ? ` | التصنيف: ${p.category}` : ''}
أعد JSON فقط:
{"pageTitle":"<45-60 حرف يبدأ بالكلمة المفتاحية>","metaDescription":"<150-160 حرف>","tags":["<وسم>","<وسم>","<وسم>","<وسم>","<وسم>","<وسم>"]}`;
  const r = await aiJSON(prompt, { temperature: 0.6, maxTokens: 1000 });
  if (r.pageTitle && r.pageTitle.length > 60) r.pageTitle = r.pageTitle.slice(0, 60).replace(/\s+\S*$/, '');
  if (r.metaDescription && r.metaDescription.length > 160) r.metaDescription = r.metaDescription.slice(0, 160).replace(/\s+\S*$/, '');
  const seo = { pageTitle: r.pageTitle || '', metaDescription: r.metaDescription || '', tags: Array.isArray(r.tags) ? r.tags : [] };
  await db.query('UPDATE store_products SET seo=$1 WHERE id=$2', [JSON.stringify(seo), p.id]).catch(() => {});
  await logGen(req.user.id, 'gen_seo', { product: p.name });
  res.json(seo);
}));

// (1) تحديث منتج واحد — يعيد سحب صفحته (صورة/سعر/وصف من المتجر) دون مزامنة كاملة
router.post('/product/:id/refresh', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  if (!p.url) return res.status(400).json({ error: 'لا يوجد رابط لهذا المنتج' });
  let fp; try { fp = await fetchProduct(p.url); } catch { fp = null; }
  if (!fp) return res.status(502).json({ error: 'تعذّر جلب صفحة المنتج من المتجر.' });
  const imgs = (fp.images && fp.images.length) ? fp.images : (fp.image ? [fp.image] : []);
  await db.query(
    `UPDATE store_products SET name=COALESCE($1,name), price=COALESCE($2,price), currency=COALESCE($3,currency),
       image=COALESCE($4,image), images=$5, category=COALESCE($6,category),
       description=CASE WHEN $7<>'' THEN $7 ELSE description END,
       has_description=($7<>'' OR has_description), updated_at=NOW() WHERE id=$8`,
    [fp.name || null, fp.price || null, fp.currency || null, fp.image || null, JSON.stringify(imgs),
     fp.category || null, (fp.description || ''), p.id]).catch(() => {});
  const prod = (await db.query('SELECT id,url,name,price,currency,image,images,category,description,has_description,seo,bullets FROM store_products WHERE id=$1', [p.id])).rows[0];
  res.json({ ok: true, product: prod });
}));

// (4) أصلح نواقص المنتج: يولّد ويحفظ ما ينقص (وصف + SEO + نقاط بيع)
router.post('/product/:id/fix-gaps', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  const q = await aiQuotaGuard(req.user.id); if (q instanceof Error) return res.status(q.status).json({ error: q.message });
  const done = [];
  // وصف
  const hasDesc = String(p.description || '').replace(/<[^>]+>/g, '').trim().length >= 20;
  if (!hasDesc) {
    try {
      const d = (await aiText(`اكتب وصفاً تسويقياً احترافياً (120-200 كلمة) للمنتج "${p.name}"${p.category ? ` (قسم: ${p.category})` : ''} يخاطب المتسوّق الخليجي، بلا عبارات مبتذلة، نص عربي مباشر فقط.`, { temperature: 0.75, maxTokens: 1000 })).replace(/^```[\s\S]*?\n|```$/g, '').trim();
      if (d) { await saveProductField(p.id, p.store_id, 'description', p.description, d); done.push('الوصف'); }
    } catch {}
  }
  // SEO
  if (!p.seo) {
    try {
      const r = await aiJSON(`حسّن SEO للمنتج "${p.name}". أعد JSON: {"pageTitle":"<حتى 60 حرف>","metaDescription":"<150-160 حرف>","tags":["<وسم>","<وسم>","<وسم>"]}`, { temperature: 0.5, maxTokens: 700 });
      const seo = { pageTitle: r.pageTitle || '', metaDescription: r.metaDescription || '', tags: Array.isArray(r.tags) ? r.tags : [] };
      if (seo.pageTitle) { await db.query('UPDATE store_products SET seo=$1 WHERE id=$2', [JSON.stringify(seo), p.id]); done.push('SEO'); }
    } catch {}
  }
  // نقاط بيع
  if (!p.bullets) {
    try {
      const r = await aiJSON(`اكتب 5 نقاط بيع قصيرة للمنتج "${p.name}". أعد JSON: {"bullets":["..","..","..","..",".."]}`, { temperature: 0.6, maxTokens: 700 });
      const bullets = Array.isArray(r.bullets) ? r.bullets.slice(0, 8) : [];
      if (bullets.length) { await db.query('UPDATE store_products SET bullets=$1 WHERE id=$2', [JSON.stringify(bullets), p.id]); done.push('نقاط البيع'); }
    } catch {}
  }
  await logGen(req.user.id, 'fix_gaps', { product: p.name });
  res.json({ ok: true, done });
}));

// (6) حملة تسويقية لقسم: بوست + كابشن + هاشتاقات من منتجات القسم
router.post('/category-campaign', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'أضف متجرك أولاً' });
  const category = String(req.body.category || '').trim();
  if (!category) return res.status(400).json({ error: 'اختر قسماً' });
  const q = await aiQuotaGuard(req.user.id); if (q instanceof Error) return res.status(q.status).json({ error: q.message });
  const prods = (await db.query('SELECT name,price,currency FROM store_products WHERE store_id=$1 AND category=$2 LIMIT 20', [store.id, category])).rows;
  if (!prods.length) return res.status(400).json({ error: 'لا منتجات في هذا القسم' });
  const list = prods.map(p => `- ${p.name}${p.price ? ` (${p.price} ${p.currency || ''})` : ''}`).join('\n');
  const prompt = `أنت خبير تسويق متاجر خليجية. أنشئ حملة تسويقية لقسم "${category}" في متجر "${store.store_name}".
المنتجات:
${list}
أعد JSON فقط: {"post":"<منشور تسويقي جذّاب 3-5 أسطر يخاطب المتسوّق الخليجي>","caption":"<كابشن قصير لإنستغرام>","hashtags":["#وسم","#وسم","#وسم","#وسم","#وسم"],"offer":"<فكرة عرض ترويجي للقسم>"}`;
  let r; try { r = await aiJSON(prompt, { temperature: 0.8, maxTokens: 1200 }); } catch { r = {}; }
  await logGen(req.user.id, 'gen_campaign', { category });
  res.json({ post: r.post || '', caption: r.caption || '', hashtags: Array.isArray(r.hashtags) ? r.hashtags : [], offer: r.offer || '' });
}));

// ─── محرّك التسويق: تقويم محتوى / منشور سوشيال / إعلان / رسالة / كوبونات ─────────
router.post('/marketing/:type', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'أضف متجرك أولاً' });
  const type = req.params.type;
  const valid = ['calendar', 'social', 'ad', 'message', 'coupons'];
  if (!valid.includes(type)) return res.status(400).json({ error: 'نوع غير معروف' });
  const q = await aiQuotaGuard(req.user.id); if (q instanceof Error) return res.status(q.status).json({ error: q.message });

  const rep = store.latest_report || {};
  const cats = (rep.categories || []).slice(0, 12).join('، ') || '—';
  const top = (await db.query('SELECT name,price,currency FROM store_products WHERE store_id=$1 ORDER BY id DESC LIMIT 12', [store.id])).rows;
  const prodLine = top.map(p => `- ${p.name}${p.price ? ` (${p.price} ${p.currency || ''})` : ''}`).join('\n') || '—';
  const base = `متجر: ${store.store_name} | الأقسام: ${cats}\nعيّنة منتجات:\n${prodLine}`;
  const platform = String(req.body.platform || '').trim();
  const occasion = String(req.body.occasion || '').trim();
  const topic = String(req.body.topic || '').trim();
  const channel = String(req.body.channel || 'whatsapp').trim();

  let prompt, shape;
  if (type === 'calendar') {
    prompt = `أنت خبير تسويق متاجر خليجية. أنشئ خطة محتوى أسبوعية (٧ أيام) لهذا المتجر${occasion ? ` بمناسبة "${occasion}"` : ''}.\n${base}\nلكل يوم: فكرة منشور قصيرة وقابلة للنشر تخاطب المتسوّق الخليجي ونوعها.\nأعد JSON فقط: {"days":[{"day":"السبت","type":"<صورة/فيديو/عرض/سؤال>","idea":"<فكرة المنشور>"}, ... 7 عناصر]}`;
    shape = r => ({ days: Array.isArray(r.days) ? r.days.slice(0, 7) : [] });
  } else if (type === 'social') {
    prompt = `أنشئ منشور ${platform || 'سوشيال ميديا'} احترافي${topic ? ` عن "${topic}"` : ' للمتجر'} يخاطب المتسوّق الخليجي.\n${base}\nأعد JSON فقط: {"post":"<نص المنشور>","caption":"<كابشن قصير>","hashtags":["#وسم","#وسم","#وسم","#وسم","#وسم"]}`;
    shape = r => ({ post: r.post || '', caption: r.caption || '', hashtags: Array.isArray(r.hashtags) ? r.hashtags : [] });
  } else if (type === 'ad') {
    prompt = `اكتب نص إعلان مدفوع على ${platform || 'سناب شات/تيك توك'}${topic ? ` لـ "${topic}"` : ''} لهذا المتجر. مقنع ومختصر ويحثّ على الشراء (CTA).\n${base}\nأعد JSON فقط: {"headline":"<عنوان جذّاب>","body":"<نص الإعلان>","cta":"<زر/دعوة لإجراء>","variants":["<بديل قصير 1>","<بديل قصير 2>"]}`;
    shape = r => ({ headline: r.headline || '', body: r.body || '', cta: r.cta || '', variants: Array.isArray(r.variants) ? r.variants : [] });
  } else if (type === 'message') {
    prompt = `اكتب رسالة ${channel === 'sms' ? 'SMS قصيرة' : 'واتساب'} تسويقية لعملاء هذا المتجر${topic ? ` عن "${topic}"` : ''}، ودودة وبخصوصية الخليج وبدون إزعاج، مع دعوة واضحة.\n${base}\nأعد JSON فقط: {"message":"<نص الرسالة>","followup":"<رسالة متابعة قصيرة بعد يومين>"}`;
    shape = r => ({ message: r.message || '', followup: r.followup || '' });
  } else { // coupons
    prompt = `اقترح ٥ أفكار عروض/كوبونات ذكية لهذا المتجر${occasion ? ` بمناسبة "${occasion}"` : ''} ترفع المبيعات بدون خسارة الهامش.\n${base}\nأعد JSON فقط: {"ideas":[{"name":"<اسم العرض>","code":"<كود مقترح>","detail":"<تفاصيل العرض>"}, ... 5]}`;
    shape = r => ({ ideas: Array.isArray(r.ideas) ? r.ideas.slice(0, 8) : [] });
  }
  let r; try { r = await aiJSON(prompt, { temperature: 0.85, maxTokens: 1600 }); } catch { r = {}; }
  await logGen(req.user.id, 'gen_campaign', { marketing: type });
  res.json(shape(r));
}));

// ─── فحص SEO شامل للمتجر ───
router.post('/seo-audit', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'أضف متجرك أولاً' });
  const qg = await aiQuotaGuard(req.user.id); if (qg instanceof Error) return res.status(qg.status).json({ error: qg.message });
  const prods = (await db.query('SELECT name,category,has_description,seo FROM store_products WHERE store_id=$1 LIMIT 80', [store.id])).rows;
  const n = prods.length || 1;
  const noDesc = prods.filter(p => !p.has_description).length;
  const noSeo = prods.filter(p => !p.seo).length;
  const noCat = prods.filter(p => !p.category).length;
  const rep = store.latest_report || {};
  const prompt = `أنت خبير SEO لمتاجر سلة/زد بالسوق الخليجي. حلّل حالة SEO لهذا المتجر بناءً على الأرقام التالية وأعطِ تقريراً عملياً.
المتجر: ${store.store_name} | الأقسام: ${(rep.categories || []).slice(0,15).join('، ') || '—'}
عدد المنتجات المفحوصة: ${n} | بلا وصف: ${noDesc} | بلا SEO: ${noSeo} | بلا قسم: ${noCat}
وصف المتجر: ${rep.summary || '—'}
أعد JSON فقط: {"score":<0-100>,"issues":["<مشكلة SEO>", ...],"quickWins":["<خطوة سريعة عالية الأثر>", ...],"keywords":["<كلمة مفتاحية مقترحة>", ...]}`;
  let r; try { r = await aiJSON(prompt, { temperature: 0.4, maxTokens: 1500 }); } catch { r = {}; }
  await logGen(req.user.id, 'gen_seo', { audit: true });
  res.json({
    score: Math.max(0, Math.min(100, parseInt(r.score) || 0)),
    issues: Array.isArray(r.issues) ? r.issues : [],
    quickWins: Array.isArray(r.quickWins) ? r.quickWins : [],
    keywords: Array.isArray(r.keywords) ? r.keywords : [],
    stats: { products: n, noDesc, noSeo, noCat },
  });
}));

// مولّد Schema (JSON-LD) لمنتج — بنية بيانات منظّمة جاهزة للصق (Rich snippets)
router.get('/product/:id/schema', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  const imgs = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
  const schema = {
    '@context': 'https://schema.org/', '@type': 'Product',
    name: p.name || '',
    image: imgs.length ? imgs : undefined,
    description: String(p.description || '').replace(/<[^>]+>/g, '').slice(0, 500) || undefined,
    category: p.category || undefined,
    sku: 'P' + p.id,
    offers: p.price ? {
      '@type': 'Offer', price: String(p.price).replace(/[^\d.]/g, ''),
      priceCurrency: (p.currency && /^[A-Z]{3}$/.test(p.currency)) ? p.currency : 'SAR',
      availability: 'https://schema.org/InStock', url: p.url || undefined,
    } : undefined,
  };
  Object.keys(schema).forEach(k => schema[k] === undefined && delete schema[k]);
  res.json({ schema, html: `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n<\/script>` });
}));

// تحسين صورة المنتج بالذكاء — يفهم المنتج ويعيد صورة احترافية بخلفية نظيفة (مع fallback)
router.post('/product/:id/enhance-image', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  if (!p.image) return res.status(400).json({ error: 'لا توجد صورة لهذا المنتج' });
  const qg = await aiQuotaGuard(req.user.id); if (qg instanceof Error) return res.status(qg.status).json({ error: qg.message });
  let sharp; try { sharp = require('sharp'); } catch { sharp = null; }
  const axios = require('axios');
  let inputBuf;
  try {
    const resp = await axios.get(p.image, { responseType: 'arraybuffer', timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    inputBuf = Buffer.from(resp.data);
  } catch { return res.status(502).json({ error: 'تعذّر جلب صورة المنتج من المتجر.' }); }
  // صغّر المُدخل لتسريع الطلب
  let inB64;
  try { inB64 = (sharp ? await sharp(inputBuf).resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer() : inputBuf).toString('base64'); }
  catch { inB64 = inputBuf.toString('base64'); }
  // القاعدة الذهبية: الحفاظ التام على المنتج (شكل/ألوان/كتابة/شعار) — تغيير الخلفية/الإضاءة فقط
  const keep = `قاعدة صارمة: حافظ على المنتج نفسه مطابقاً 100% (نفس الشكل، الحجم النسبي، الألوان، النقوش، أي كتابة أو شعار). لا تعِد رسم المنتج، لا تشوّهه، لا تضف أو تحذف أجزاء منه، ولا تغيّر النص المكتوب عليه. التعديل على المحيط فقط.`;
  const mode = (req.body.mode === 'lifestyle') ? 'lifestyle' : 'clean';
  const prompt = mode === 'lifestyle'
    ? `هذه صورة منتج اسمه "${p.name}"${p.category ? ` من قسم "${p.category}"` : ''}. ضع المنتج في مشهد "لايف ستايل" واقعي وأنيق يناسب استخدامه ويجذب المتسوّق الخليجي (بيئة مناسبة، سطح/خلفية متناسقة، إضاءة طبيعية ناعمة، عمق ميدان لطيف). ${keep}`
    : `هذه صورة منتج اسمه "${p.name}"${p.category ? ` من قسم "${p.category}"` : ''}. حوّلها لصورة منتج احترافية لمتجر إلكتروني: خلفية بيضاء نظيفة تماماً (#ffffff)، إضاءة استوديو متوازنة بلا ظلال قاسية، حواف حادة وألوان دقيقة وواقعية. ${keep}`;
  try {
    const out = await aiImage(prompt, { mimeType: 'image/jpeg', data: inB64 });
    await logGen(req.user.id, 'gen_campaign', { enhance_image: p.id });
    return res.json({ ok: true, ai: true, image: `data:${out.mimeType};base64,${out.data}`, name: (p.name || 'product').replace(/[\\/:*?"<>|]/g, '').slice(0, 40) });
  } catch (e) {
    logger.warn('enhance-image AI fail: ' + (e.message || '').slice(0, 80));
    // fallback: خلفية بيضاء عبر sharp
    if (sharp) {
      try {
        const out = await sharp(inputBuf).resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).webp({ quality: 82 }).toBuffer();
        return res.json({ ok: true, ai: false, image: 'data:image/webp;base64,' + out.toString('base64'), name: (p.name || 'product').replace(/[\\/:*?"<>|]/g, '').slice(0, 40) });
      } catch {}
    }
    return res.status(502).json({ error: 'تعذّر تحسين الصورة الآن، حاول لاحقاً.' });
  }
}));

// ─── تجربة العميل: FAQ / سياسات / ردّ على تقييم / ردود واتساب جاهزة ──────────────
router.post('/support/:type', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'أضف متجرك أولاً' });
  const type = req.params.type;
  if (!['faq', 'policy', 'review-reply', 'whatsapp'].includes(type)) return res.status(400).json({ error: 'نوع غير معروف' });
  const qg = await aiQuotaGuard(req.user.id); if (qg instanceof Error) return res.status(qg.status).json({ error: qg.message });
  const rep = store.latest_report || {};
  const ctx = `متجر: ${store.store_name} | الأقسام: ${(rep.categories || []).slice(0, 12).join('، ') || '—'}`;
  let prompt, shape;
  if (type === 'faq') {
    prompt = `${ctx}\nاكتب 8 أسئلة شائعة وإجاباتها لهذا المتجر (شحن، دفع، استرجاع، مقاسات، توصيل...) تخاطب المتسوّق الخليجي بإيجاز.\nأعد JSON فقط: {"faq":[{"q":"<سؤال>","a":"<إجابة>"}, ...]}`;
    shape = r => ({ faq: Array.isArray(r.faq) ? r.faq.slice(0, 12) : [] });
  } else if (type === 'policy') {
    const kind = ({ shipping: 'سياسة الشحن والتوصيل', return: 'سياسة الاستبدال والاسترجاع', privacy: 'سياسة الخصوصية', exchange: 'سياسة الاستبدال' })[req.body.kind] || 'سياسة المتجر';
    prompt = `${ctx}\nاكتب "${kind}" احترافية ومناسبة لمتجر إلكتروني خليجي، واضحة ومنظّمة بنقاط، بالعربية الفصحى المبسّطة.\nأعد JSON فقط: {"title":"${kind}","body":"<نص السياسة منسّق بأسطر ونقاط>"}`;
    shape = r => ({ title: r.title || kind, body: r.body || '' });
  } else if (type === 'review-reply') {
    const review = String(req.body.review || '').slice(0, 800);
    if (!review) return res.status(400).json({ error: 'الصق نص التقييم' });
    prompt = `${ctx}\nعميل كتب هذا التقييم${req.body.rating ? ` (${req.body.rating}/5)` : ''}: "${review}"\nاكتب ردّاً احترافياً مهذّباً مناسباً للهجة الخليج، وحدّد المشاعر.\nأعد JSON فقط: {"sentiment":"<إيجابي/سلبي/محايد>","reply":"<الرد المقترح>"}`;
    shape = r => ({ sentiment: r.sentiment || '', reply: r.reply || '' });
  } else { // whatsapp
    prompt = `${ctx}\nاكتب 6 ردود واتساب جاهزة لمواقف شائعة (ترحيب، توفر منتج، حالة الطلب، الشحن، الاسترجاع، شكر بعد الشراء) قصيرة وودودة بلهجة الخليج.\nأعد JSON فقط: {"templates":[{"title":"<الموقف>","text":"<الرد>"}, ...]}`;
    shape = r => ({ templates: Array.isArray(r.templates) ? r.templates.slice(0, 10) : [] });
  }
  let r; try { r = await aiJSON(prompt, { temperature: 0.6, maxTokens: 1800 }); } catch { r = {}; }
  await logGen(req.user.id, 'gen_campaign', { support: type });
  res.json(shape(r));
}));

// ─── توليد خطة هذا الأسبوع: مهام عملية مرتّبة بالأولوية من حالة المتجر الفعلية ────
router.post('/weekly-plan', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'أضف متجرك أولاً' });
  const prods = (await db.query('SELECT has_description,image,images,seo,category FROM store_products WHERE store_id=$1', [store.id])).rows;
  const noDesc = prods.filter(p => !p.has_description).length;
  const noImg = prods.filter(p => !p.image && !(Array.isArray(p.images) && p.images.length)).length;
  const noSeo = prods.filter(p => !p.seo).length;
  const noCat = prods.filter(p => !p.category).length;
  const rep = store.latest_report || {};
  // مهام مشتقة من الفجوات (أولوية أعلى) + توصيات الذكاء
  const ideas = [];
  if (noDesc) ideas.push(`اكتب أوصاف بيع لـ ${noDesc} منتج بلا وصف (استخدم «توليد جماعي للقسم»).`);
  if (noImg) ideas.push(`أضف صوراً واضحة لـ ${noImg} منتج بلا صورة.`);
  if (noSeo) ideas.push(`حسّن SEO لـ ${noSeo} منتج لرفع ظهورك في جوجل.`);
  if (noCat) ideas.push(`صنّف ${noCat} منتج غير مرتبط بقسم.`);
  (rep.recommendations || []).slice(0, 6).forEach(r => ideas.push(String(r)));
  if (!ideas.length) ideas.push('متجرك مكتمل — ركّز على التسويق: أنشئ خطة محتوى أسبوعية ونفّذها.');
  // أدخل الجديد فقط في خطة العمل
  const existing = (await db.query('SELECT text FROM store_tasks WHERE store_id=$1', [store.id])).rows.map(r => r.text);
  let order = existing.length, added = 0;
  for (const t of ideas.slice(0, 10)) {
    if (t && !existing.includes(t)) { await db.query('INSERT INTO store_tasks (store_id,text,sort_order) VALUES ($1,$2,$3)', [store.id, t, order++]).catch(() => {}); added++; }
  }
  const tasks = (await db.query('SELECT id,text,done FROM store_tasks WHERE store_id=$1 ORDER BY done ASC, sort_order ASC, id ASC', [store.id])).rows;
  res.json({ ok: true, added, tasks });
}));

// حد استخدام الذكاء الحالي (للعرض في الواجهة)
router.get('/usage', auth, ar(async (req, res) => {
  const quota = await getAiQuota(req.user.id);
  const used = quota > 0 ? await aiUsedThisMonth(req.user.id) : 0;
  res.json({ quota, used, remaining: quota > 0 ? Math.max(0, quota - used) : null });
}));

// ضغط صورة منتج — يجلبها من المتجر ويعيدها مضغوطة (base64) للتحميل
router.post('/product/:id/compress-image', auth, ar(async (req, res) => {
  const p = await getMyProduct(req.user.id, req.params.id);
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  if (!p.image) return res.status(400).json({ error: 'لا توجد صورة لهذا المنتج' });
  let sharp; try { sharp = require('sharp'); } catch { return res.status(501).json({ error: 'الضغط غير متاح' }); }
  try {
    const axios = require('axios');
    const resp = await axios.get(p.image, { responseType: 'arraybuffer', timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const orig = Buffer.from(resp.data);
    let pipe = sharp(orig).resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true });
    if (req.body.white || req.query.white) pipe = pipe.flatten({ background: '#ffffff' }); // خلفية بيضاء نظيفة للصور الشفافة
    const out = await pipe.webp({ quality: 80 }).toBuffer();
    res.json({
      ok: true,
      originalSize: orig.length,
      compressedSize: out.length,
      saved: Math.max(0, Math.round((1 - out.length / orig.length) * 100)),
      image: 'data:image/webp;base64,' + out.toString('base64'),
      name: (p.name || 'product').replace(/[\\/:*?"<>|]/g, '').slice(0, 40),
    });
  } catch (e) {
    logger.warn('compress-image fail: ' + e.message);
    res.status(502).json({ error: 'تعذّر جلب/ضغط الصورة (قد يمنعها المتجر).' });
  }
}));

// ─── خطة العمل (المهام) ───────────────────────────────────────────────────────
router.get('/tasks', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.json({ tasks: [] });
  const tasks = (await db.query('SELECT id,text,done FROM store_tasks WHERE store_id=$1 ORDER BY done ASC, sort_order ASC, id ASC', [store.id])).rows;
  res.json({ tasks });
}));
router.put('/tasks/:id', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'لا متجر' });
  await db.query('UPDATE store_tasks SET done=$1 WHERE id=$2 AND store_id=$3', [!!req.body.done, req.params.id, store.id]);
  res.json({ ok: true });
}));
router.post('/tasks', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'لا متجر' });
  const text = String(req.body.text || '').trim().slice(0, 300);
  if (!text) return res.status(400).json({ error: 'اكتب مهمة' });
  const { rows } = await db.query('INSERT INTO store_tasks (store_id,text) VALUES ($1,$2) RETURNING id,text,done', [store.id, text]);
  res.json({ task: rows[0] });
}));
router.delete('/tasks/:id', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (store) await db.query('DELETE FROM store_tasks WHERE id=$1 AND store_id=$2', [req.params.id, store.id]);
  res.json({ ok: true });
}));
// ترتيب المهام بالسحب والإفلات
router.post('/tasks/reorder', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'لا متجر' });
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
  for (let i = 0; i < ids.length; i++) {
    await db.query('UPDATE store_tasks SET sort_order=$1 WHERE id=$2 AND store_id=$3', [i, ids[i], store.id]).catch(() => {});
  }
  res.json({ ok: true });
}));

// ─── إجراءات جماعية: تحسين أوصاف المنتجات الناقصة / توليد SEO للكل ──────────────
router.post('/bulk/:type', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'لا متجر' });
  const type = req.params.type; // description | seo
  if (!['description', 'seo'].includes(type)) return res.status(400).json({ error: 'نوع غير صالح' });
  const q = await aiQuotaGuard(req.user.id); if (q instanceof Error) return res.status(q.status).json({ error: q.message });
  const category = String(req.body.category || '').trim(); // (5) قصر التوليد على قسم معيّن

  // المنتجات المستهدفة: بلا وصف للوصف، الكل (حتى 60) للـSEO — مع فلتر القسم اختيارياً
  const args = [store.id];
  let where = type === 'description' ? "AND (has_description=false OR description IS NULL OR description='')" : '';
  if (category) { args.push(category); where += ` AND category=$${args.length}`; }
  const prods = (await db.query(`SELECT id,name,category,price,currency,description FROM store_products WHERE store_id=$1 ${where} LIMIT 60`, args)).rows;
  if (!prods.length) return res.json({ ok: true, processed: 0, message: type === 'description' ? 'كل المنتجات لها وصف بالفعل' : 'لا منتجات' });

  let processed = 0;
  for (let i = 0; i < prods.length; i += 4) {
    const batch = prods.slice(i, i + 4);
    await Promise.all(batch.map(async p => {
      try {
        if (type === 'description') {
          const prompt = `اكتب وصفاً تسويقياً احترافياً (100-180 كلمة) للمنتج "${p.name}"${p.category ? ` (قسم: ${p.category})` : ''} يخاطب المتسوّق الخليجي، بلا عبارات مبتذلة، نص عربي مباشر فقط.`;
          const d = (await aiText(prompt, { temperature: 0.7, maxTokens: 900 })).replace(/^```[\s\S]*?\n|```$/g, '').trim();
          if (d) { await saveProductField(p.id, store.id, 'description', p.description, d); processed++; }
        } else {
          const prompt = `حسّن SEO للمنتج "${p.name}". أعد JSON: {"pageTitle":"<حتى 60 حرف>","metaDescription":"<150-160 حرف>","tags":["<وسم>","<وسم>","<وسم>"]}`;
          const r = await aiJSON(prompt, { temperature: 0.5, maxTokens: 700 });
          if (r.pageTitle) { const seo = { pageTitle: r.pageTitle, metaDescription: r.metaDescription || '', tags: Array.isArray(r.tags) ? r.tags : [] }; await db.query('UPDATE store_products SET seo=$1 WHERE id=$2', [JSON.stringify(seo), p.id]).catch(() => {}); processed++; }
        }
      } catch (e) { /* تخطّى الفاشل */ }
    }));
  }
  await logGen(req.user.id, type === 'description' ? 'bulk_description' : 'bulk_seo', { category, processed });
  res.json({ ok: true, processed, total: prods.length });
}));

// ─── مقارنة بمنافس ────────────────────────────────────────────────────────────
router.post('/compare', auth, ar(async (req, res) => {
  const store = await resolveStore(req.user.id, reqStoreId(req));
  if (!store) return res.status(400).json({ error: 'أضف متجرك أولاً' });
  const compUrl = normUrl(req.body.url || '');
  if (!compUrl) return res.status(400).json({ error: 'أدخل رابط منافس صحيح' });
  const q = await aiQuotaGuard(req.user.id); if (q instanceof Error) return res.status(q.status).json({ error: q.message });
  let comp;
  try { comp = await scrapeStoreFull(compUrl, { limit: 60 }); }
  catch (e) { return res.status(502).json({ error: 'تعذّر الوصول لمتجر المنافس.' }); }
  const avgOf = arr => { const v = arr.map(x => parseFloat(x)).filter(n => !isNaN(n) && n > 0); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const rep = store.latest_report || {};
  const myAudit = rep.audit || {};
  // أسعار متجري من قاعدة البيانات
  const myPrices = (await db.query('SELECT price FROM store_products WHERE store_id=$1 AND price IS NOT NULL', [store.id])).rows.map(r => r.price);
  // فحص المنافس (دفع/SEO/ثقة) من صفحته
  let compAudit = {}; try { compAudit = auditStore(comp.html, comp.url); } catch {}
  const mine = {
    name: store.store_name, score: store.latest_score ?? null,
    products: rep.productsCount ?? null, categories: (rep.categories || []).length,
    avgPrice: avgOf(myPrices), payment: (myAudit.payment && myAudit.payment.methods) || [],
    seoScore: myAudit.seo ? myAudit.seo.score : null, trustScore: myAudit.trust ? myAudit.trust.score : null,
    socials: Object.keys(rep.socials || {}),
  };
  const his = {
    name: comp.storeName, products: comp.productUrlsCount ?? (comp.products || []).length,
    categories: (comp.menuCategories || []).length, avgPrice: avgOf((comp.products || []).map(p => p.price)),
    payment: (compAudit.payment && compAudit.payment.methods) || [],
    seoScore: compAudit.seo ? compAudit.seo.score : null, trustScore: compAudit.trust ? compAudit.trust.score : null,
    socials: Object.keys(comp.socials || {}),
  };
  const prompt = `قارن متجري بمنافسي وأعطِ تحليلاً عملياً موجزاً للسوق الخليجي.
متجري: ${JSON.stringify(mine)}
المنافس: ${JSON.stringify(his)}
ركّز على: المنتجات، الأسعار (من أرخص/أغلى ولماذا)، طرق الدفع، SEO، الثقة، التواصل.
أعد JSON فقط: {"summary":"<مقارنة بجملتين>","pricing":"<جملة عن موقعي السعري مقابله>","advantages":["<ميزة لي>"],"gaps":["<فجوة عندي يتفوّق بها المنافس>"],"plan":["<خطوة تفوّق عملية>"]}`;
  let r; try { r = await aiJSON(prompt, { temperature: 0.4, maxTokens: 1600 }); } catch (e) { r = {}; }
  await logGen(req.user.id, 'gen_campaign', { compare: comp.storeName });
  res.json({
    mine, competitor: his,
    summary: r.summary || '', pricing: r.pricing || '',
    advantages: r.advantages || [], gaps: r.gaps || [], plan: r.plan || [],
    competitorUrl: compUrl,
  });
}));

module.exports = router;
module.exports.syncStore = syncStore;
