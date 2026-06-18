const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { auth, optionalAuth } = require('../middleware/auth');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { runPatterns } = require('../analyzer/patterns');
const { estimateMonthlyVisitors, calculateTotalLoss } = require('../analyzer/revenue/calculator');
const { getProfile, detectIndustryKey } = require('../analyzer/industries');
const { saveSnapshot, compareSnapshots, getActions, upsertAction } = require('../analyzer/snapshots');
const { runV5Analysis } = require('../analyzer');
const servicesCatalog = require('../analyzer/services-catalog');

// حفظ التحليل كطلب يصل للأدمن (ملخّص مُركّز فقط لتقليل الحجم)
async function saveAnalysisSubmission(userId, storeUrl, category, r) {
  try {
    const report = {
      overallScore: r.overallScore, trustScore: r.trustScore,
      storeName: r.storeName, platform: r.platform, detectedIndustry: r.detectedIndustry,
      strengths: (r.strengths || []).slice(0, 8),
      weaknesses: (r.weaknesses || []).slice(0, 10),
      criteria: (r.criteria || []).map(c => ({ name: c.name, status: c.status })).slice(0, 30),
      recommendedServices: (r.recommendedServices || []).map(s => ({ name: s.name, price: s.price, currency: s.currency, url: s.url, why: s.why })),
      performanceScore: r.technicalData && r.technicalData.pageSpeed ? r.technicalData.pageSpeed.performanceScore : null,
    };
    await db.query(
      `INSERT INTO analysis_submissions (user_id, store_url, store_name, platform, category, score, report)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId, storeUrl, r.storeName || null, r.platform || null, category || null, r.overallScore || null, JSON.stringify(report)]
    );
  } catch (e) { /* غير حرج */ }
}

// ─── Salla/Zid Theme Database ─────────────────────────────────────────────────
const SALLA_ZID_THEMES = (() => {
  try {
    const enc = 'eyJ0aGVtZXMvMTI0Nzg3NDI0NiI6eyJuYW1lIjoi2LHYp9im2K8ifSwidGhlbWVzLzU2ODU5NzU2MyI6' +
      'eyJuYW1lIjoi2YbZhdmIIn0sInRoZW1lcy8yMDM4MTczNTM5Ijp7Im5hbWUiOiLZiNin2KvZgiJ9LCJ0aGVtZXMvNDA0MDQ2MDY2Ijp7Im5hbWUiOiLZgdix2YrYryJ9LCJ0aGVtZXMvMzkyNTYzNzUzIjp7Im5hbWUiOiLYstmK2YYifSwidGhlbWVzLzc2NjM2MDA1OCI6eyJuYW1lIjoi2YHYrtin2YXYqSJ9LCJ0aGVtZXMvMTYxNzYyODU1NiI6eyJuYW1lIjoi2KfZhdiq2YrYp9iyIn0sInRoZW1lcy8xMDM0NjQ4Mzk2Ijp7Im5hbWUiOiLZhdmE2KfZgyJ9LCJ0aGVtZXMvMTY5NjIxOTIyMSI6eyJuYW1lIjoi2YjYs9in2YUifSwidGhlbWVzLzE5NzE3MzQ5NiI6eyJuYW1lIjoi2YXYrtiq2YTZgSJ9LCJ0aGVtZXMvNTc1MzM4MDQ2Ijp7Im5hbWUiOiLYstin2YfYsSJ9LCJ0aGVtZXMvNTEzNDk5OTQzIjp7Im5hbWUiOiLYqNix2YrYs9iq2YrYrCJ9LCJ0aGVtZXMvMjY4NDI5NjEwIjp7Im5hbWUiOiLZhtmI2LEifSwidGhlbWVzLzEyNDU0NjQ5NTYiOnsibmFtZSI6Itis2YXZitmEIn0sInRoZW1lcy8xMDQ5MTU5ODM1Ijp7Im5hbWUiOiLZhdmI2LnYryJ9LCJ0aGVtZXMvNjAwNjM5NzE3Ijp7Im5hbWUiOiLZg9mE2YrZgyJ9LCJ0aGVtZXMvNDY2MTU3MjI5Ijp7Im5hbWUiOiLYo9mD2KfYs9mK2KcifSwidGhlbWVzLzIwNDgxNzg0NzIiOnsibmFtZSI6Itio2YrZiNiq2YoifSwidGhlbWVzLzE0ODAyNDg4MjkiOnsibmFtZSI6ItmF2KrYrNixIn0sInRoZW1lcy8yMTAxODk1ODk5Ijp7Im5hbWUiOiLYsdmH2YrYqCJ9LCJ0aGVtZXMvMTg5NDM2ODkwOSI6eyJuYW1lIjoi2KfYt9mE2KfZhNipIn0sInRoZW1lcy8xOTc0MjAxNDI0Ijp7Im5hbWUiOiLYsdik2YrYqSJ9LCJ0aGVtZXMvMTY2MDcwNzM0NiI6eyJuYW1lIjoi2LHZgtmF2YkifSwidGhlbWVzLzU4MTkyODY5OCI6eyJuYW1lIjoi2LPZitmE2YrYpyJ9LCJ0aGVtZXMvMTc1MzUxNzYyNCI6eyJuYW1lIjoi2LnYp9mE2YoifSwidGhlbWVzLzE3NTU4NjUzNjgiOnsibmFtZSI6Itio2YjYqtmK2YMifSwidGhlbWVzLzEyNTM5MTY5MDciOnsibmFtZSI6Itio2YrZhNinIn0sInRoZW1lcy83MjQ1MjI2MDEiOnsibmFtZSI6ItmF2KjYr9i5In0sInRoZW1lcy8xMDQ4MTk4OTI3Ijp7Im5hbWUiOiLYtNmI2KjZhtisIn0sInRoZW1lcy8yMDkzMzEzNzU2Ijp7Im5hbWUiOiLZitin2YHYpyJ9LCJ0aGVtZXMvMjE0MjE5Njk1OCI6eyJuYW1lIjoi2KjYsdmK2YIifSwidGhlbWVzLzEwMTY1NzAxNzAiOnsibmFtZSI6Iti52YTYpyJ9LCJ0aGVtZXMvMjA3MTU5NjMwNyI6eyJuYW1lIjoi2KzZhNin2YXZiNixIn0sInRoZW1lcy8xNDg1NDI5NTMyIjp7Im5hbWUiOiLYsdmK2LMifSwidGhlbWVzLzUzOTY4NDAwMyI6eyJuYW1lIjoi2K7Yt9mI2YcifSwidGhlbWVzLzE0NjIxMDM4NzIiOnsibmFtZSI6ItmC2LXYtSJ9LCJ0aGVtZXMvMTE0NTY5OTI0OCI6eyJuYW1lIjoi2YPYsdin2YjZhiJ9LCJ0aGVtZXMvMzM4MTkwNDk5Ijp7Im5hbWUiOiLZg9mK2KfZhiJ9LCJ0aGVtZXMvMTU4MjYyNDEwNSI6eyJuYW1lIjoi2YTZiNmB2YrYstinIn0sInRoZW1lcy8zNjg5MjE3MDAiOnsibmFtZSI6ItmG2YXYp9ihIn0sInRoZW1lcy8xNjYyODQwOTQ3Ijp7Im5hbWUiOiLZhdin2LHZg9iqIn0sInRoZW1lcy8yNDU2NzExNDciOnsibmFtZSI6Itix2YjYrSJ9LCJ0aGVtZXMvODIyNDU3OTY1Ijp7Im5hbWUiOiLYudi32KfYoSJ9LCJ0aGVtZXMvMTU0NjMyODYyOSI6eyJuYW1lIjoi2LPZhdin2LHYqiJ9LCJ0aGVtZXMvNjM4OTU2MTMwIjp7Im5hbWUiOiLYq9mF2YYifSwidGhlbWVzLzk0NTMzNjIxNCI6eyJuYW1lIjoi2LPYp9is2YoifSwidGhlbWVzLzE4Mjc1NzQ0MDAiOnsibmFtZSI6Itix2YbYp9mI2KfZiiJ9LCJ0aGVtZXMvNTk2MzMzMDQxIjp7Im5hbWUiOiLYp9io2K/Yp9i5In0sInRoZW1lcy8xNTM0MzI2MTg4Ijp7Im5hbWUiOiLYsdit2YTYqSJ9LCJ0aGVtZXMvMTQ2MDg2ODE2NiI6eyJuYW1lIjoi2KLYsdiqIn0sInRoZW1lcy81MDI5MjUzMzIiOnsibmFtZSI6Itis2YTZiNio2YkifSwidGhlbWVzLzI2ODM0MTcwNSI6eyJuYW1lIjoi2LDZh9ioIn0sInRoZW1lcy8xNTQ0NjA2NDc4Ijp7Im5hbWUiOiLZhdix2K0ifSwidGhlbWVzLzI2NTk5Mzk2MSI6eyJuYW1lIjoi2LnZj9mI2K8ifSwidGhlbWVzLzEyNDE2MTc4MjIiOnsibmFtZSI6Itix2K3ZitmCIn0sInRoZW1lcy8yMDg0NzczODM2Ijp7Im5hbWUiOiLZgdix2YrYtNmF2KfYsdiqIn0sInRoZW1lcy8xODIyMzI3ODQ5Ijp7Im5hbWUiOiLZgtmH2YjYqSJ9LCJ0aGVtZXMvNDI5NzU1NDYxIjp7Im5hbWUiOiLYutmG2KcifSwidGhlbWVzLzE3ODAyOTExNzAiOnsibmFtZSI6Itio2YrYp9mG2YgifSwidGxhbmRpbmctcGFnZS9tYXN0ZXIiOnsibmFtZSI6Itio2K/Yp9mK2KkifSwidGhlbWVzLzUxMDQxMzU0MCI6eyJuYW1lIjoi2YHYp9i02YjZhiJ9LCJ0aGVtZXMvNzgxNzA2NTg0Ijp7Im5hbWUiOiLYrNmF2YrZhNipIn0sInRoZW1lcy8xNTc3MTk2MTQzIjp7Im5hbWUiOiLYqNmE2YrZhtivIn0sInRoZW1lcy83Nzg3NTQxMSI6eyJuYW1lIjoi2KzZiNmE2K/ZhiJ9LCJ0aGVtZXMvMTczNDYwODk5NyI6eyJuYW1lIjoi2KjZgNix2YrZgNiz2YDYqtmA2KcifSwidGhlbWVzLzE5ODA2NTQyMzYiOnsibmFtZSI6Itiu2YrYp9mEIn0sInRoZW1lcy8xOTg0MTg0NzgwIjp7Im5hbWUiOiLYs9io2YjYsdiq2YHYp9mKIn0sInRoZW1lcy8xMDg2MzIxNDE3Ijp7Im5hbWUiOiLYp9mE2KPYtdin2YrZhCJ9LCJ0aGVtZXMvMTQyNDUwNzg2NiI6eyJuYW1lIjoi2YTZhdiz2KkifSwidGhlbWVzLzEzODAyNzI2MyI6eyJuYW1lIjoi2KrZitix2KcifSwidGhlbWVzLzU5MjczNDY3MCI6eyJuYW1lIjoi2KzZiNiq2LHYp9ivIn0sInRoZW1lcy81NjkxOTczNzMiOnsibmFtZSI6ItmG2YjapNinIn0sInRoZW1lcy8xNjUxNjgwMDIxIjp7Im5hbWUiOiLZhtmC2KfYoSJ9LCJ0aGVtZXMvMTI2MzYwMjIwMSI6eyJuYW1lIjoi2YbYs9mK2KwifSwidGhlbWVzLzEzNjk1NjEwOTciOnsibmFtZSI6Itis2YTZitmF2LEifSwidGhlbWVzLzU3MjM2MTU0MiI6eyJuYW1lIjoi2KPZhNmK2YEifSwidGhlbWVzLzE2ODgyOTc0MTAiOnsibmFtZSI6ItmF2YjYp9iz2YUifSwidGhlbWVzLzEzNTA4NTAwNzgiOnsibmFtZSI6Iti02YrZgyJ9LCJ0aGVtZXMvMTA1Nzg2MjUxMSI6eyJuYW1lIjoi2YTZitis2YgifSwidGhlbWVzLzIxMTY4MTU1NDIiOnsibmFtZSI6ItmF2LPYp9mE2YUifSwidGhlbWVzLzEyNTMxMDMwMCI6eyJuYW1lIjoi2KjZh9is2KkifSwidGhlbWVzLzk4MDYyMDc5MyI6eyJuYW1lIjoi2YXYsNin2YIifSwidGhlbWVzLzc1NTg3MTQ0NiI6eyJuYW1lIjoi2LHZiNin2LPZiiJ9LCJ0aGVtZXMvMjAwMjg5NzkxMSI6eyJuYW1lIjoi2KfYsdiq2YLYp9ihIn0sInRoZW1lcy8xMDQxMTA3Mzg0Ijp7Im5hbWUiOiLYqNmE2YjYsSJ9LCJ0aGVtZXMvODAwMjExMTgxIjp7Im5hbWUiOiLZidin2LPZhdmK2YYifSwidGhlbWVzLzIyMDQ2OTMxNCI6eyJuYW1lIjoi2LPYqtmI2LHZitinIn0sInRoZW1lcy8yMTc3OTY0MjYiOnsibmFtZSI6Itiz2KrYsdmHIn0sInRoZW1lcy8xNTkyOTQ2NjM1Ijp7Im5hbWUiOiLYo9mE2YjYsdmKIn0sInRoZW1lcy8xMTQxNzk5NzIwIjp7Im5hbWUiOiLYp9mK2YPZiCJ9LCJ0aGVtZXMvNzY1Nzg0MTcyIjp7Im5hbWUiOiLYrdix2YrYsSJ9LCJ0aGVtZXMvODQ1NDA2OTc4Ijp7Im5hbWUiOiLYp9mD2LPYqtix2KcifSwidGhlbWVzLzEwODI1NjE2NzYiOnsibmFtZSI6Itij2YrZgtmI2YbYqSJ9LCJ0aGVtZXMvMTExMTI5MzcwNiI6eyJuYW1lIjoi2KPYtdmK2YQifSwidGhlbWVzLzM0MjYxNzc3MiI6eyJuYW1lIjoi2LPZitmF2KrYpyJ9LCJ0aGVtZXMvMTQ2NzcyNDQ2NCI6eyJuYW1lIjoi2LHZiNmG2YIifSwidGhlbWVzLzExNTU0Nzk5MzEiOnsibmFtZSI6Itiy2YrZhtipIn0sInRoZW1lcy81MTk3ODY0OTkiOnsibmFtZSI6ItmI2LXZhNipIn0sInRoZW1lcy85OTYwODg5MDciOnsibmFtZSI6Itil2YTZg9iq2LHZiNmGIn0sInRoZW1lcy8yMDY4MDMwMTU2Ijp7Im5hbWUiOiLYs9mD2LHZiiJ9LCJ0aGVtZXMvMjgxNzE4NzA3Ijp7Im5hbWUiOiLZhtin2YrYsyJ9LCJ0aGVtZXMvMjEzNDI5MTg3OSI6eyJuYW1lIjoi2KfYq9in2KsifSwidGhlbWVzLzQ3NTY5MTMxIjp7Im5hbWUiOiLYpdiz2KjYp9ix2YMifSwidGhlbWVzLzE4MTgzNDczMDkiOnsibmFtZSI6ItmE2YjZhtinIn0sInRoZW1lcy8xNzM5NTM3NTcyIjp7Im5hbWUiOiLZhNmI2YPYsyJ9LCJ0aGVtZXMvMTE4OTQ0NDQ4MiI6eyJuYW1lIjoi2KfZhNmD2KrYsdinIn0sInRoZW1lcy8xNzg5OTI0NDQ5Ijp7Im5hbWUiOiLYs9iq2YrYqNin2KgifSwidGhlbWVzLzE1OTkzNzkyNjQiOnsibmFtZSI6Itio2LHZiNiq2KfZhCJ9LCJ0aGVtZXMvODM1NzcxMjcyIjp7Im5hbWUiOiLZgdmG2KzYp9mEIn0sInRoZW1lcy83MTE0MTE0NDciOnsibmFtZSI6Itij2YbYp9mC2KkifSwidGhlbWVzLzI1MTgyNDI5NyI6eyJuYW1lIjoi2KrYp9isIn0sInRoZW1lcy8xNjg4OTg0MTAxIjp7Im5hbWUiOiLYqtmD2YbZiCJ9LCJ0aGVtZXMvMzI0NDQ3ODY4Ijp7Im5hbWUiOiLYqNix2KfZhtivIn0sInRoZW1lcy8xMTU0NzkyNzI4Ijp7Im5hbWUiOiLYt9mK2KjYqSJ9LCJ0aGVtZXMvMTMxODQ4MjU3OCI6eyJuYW1lIjoi2YHYp9ix2YXYp9iz2KfZhCJ9LCJ0aGVtZXMvMzIzMDM3OTE5Ijp7Im5hbWUiOiLZhdin2YPYsyJ9LCJ0aGVtZXMvOTM0NjE0NDY4Ijp7Im5hbWUiOiLZhNmK2YTZhyJ9LCJ0aGVtZXMvOTQzODM3ODQ4Ijp7Im5hbWUiOiLYqtix2LMifSwidGhlbWVzLzk2NTEyMDQ4MiI6eyJuYW1lIjoi2YjZh9isIn0sInRoZW1lcy8xNjYzOTg4NzE2Ijp7Im5hbWUiOiLZhNin2YHZhtiv2LEifSwidGhlbWVzLzc2NDEzMDY4Ijp7Im5hbWUiOiLYsdin2YTZiiJ9LCJ0aGVtZXMvMjA5MDQ3NTU2Ijp7Im5hbWUiOiLYqtiz2YjZgiJ9LCJ0aGVtZXMvMTkyMTMzNjk5MSI6eyJuYW1lIjoi2YHZhNmI2LHZitiy2KcifSwidGhlbWVzLzMxOTcwNjA1MyI6eyJuYW1lIjoi2YHZhNmI2LHYpyJ9LCJ0aGVtZXMvMjEzMjE0MjM5NyI6eyJuYW1lIjoi2KzZiNmKINiq2YjZiiJ9LCJ0aGVtZXMvODkyMjE2MjU3Ijp7Im5hbWUiOiLZhNmK2KfZhNmKIn0sInRoZW1lcy8xOTI1ODQyNDA5Ijp7Im5hbWUiOiLYtNmH2K8ifSwidGhlbWVzLzE0NTYwNzAyOTUiOnsibmFtZSI6ItmE2YrZhdinIn0sInRoZW1lcy84NTYyODg0MjUiOnsibmFtZSI6Itij2LHZitmD2KkifSwidGhlbWVzLzk4MDM5MzEzMiI6eyJuYW1lIjoi2LHZgtmKIn0sInRoZW1lcy8xMDQ5NTU5ODQ3Ijp7Im5hbWUiOiLYqNmQ2YrZhtmS2YMifSwidGhlbWVzLzQ5ODEzMjcyMyI6eyJuYW1lIjoi2KPZg9iq2YrZgSJ9LCJ0aGVtZXMvMTA3NTQ2MjYwIjp7Im5hbWUiOiLYr9ix2KgifSwidGhlbWVzLzE5NDYxNzUzNzciOnsibmFtZSI6Itix2YrYo9mD2KoifSwidGhlbWVzLzUzMTg0MzEzMCI6eyJuYW1lIjoi2LTZgNmA2KfYsdio2YDZgNmAIn0sInRoZW1lcy8yMjExNTY1MTciOnsibmFtZSI6Itio2YrZiNixIn0sInRoZW1lcy84MjY1OTU1NTEiOnsibmFtZSI6Itiq2YXZiNixIn0sInRoZW1lcy8xMjU3MzY5MzM4Ijp7Im5hbWUiOiLYt9ix2KfYsiJ9LCJ0aGVtZXMvNzYzMTYwNzA3Ijp7Im5hbWUiOiLYudmQ2YbYp9mGIn0sInRoZW1lcy8xMTM2MDk5NzgwIjp7Im5hbWUiOiLZgdmK2YgifSwidGhlbWVzLzY1MDcxMTYwNCI6eyJuYW1lIjoi2K/Zitis2YrYqtin2YQifSwidGhlbWVzLzE3ODM1OTQxMTciOnsibmFtZSI6Iti32YrZgSJ9LCJ0aGVtZXMvNTE5Mjk5MDk0Ijp7Im5hbWUiOiLZgdiu2LEifSwidGhlbWVzLzg0MTU5NDkwNyI6eyJuYW1lIjoi2KjZitiq2LPZiiJ9LCJ0aGVtZXMvMTAyOTMwMDA3NSI6eyJuYW1lIjoi2KPZj9mG2LMifSwidGhlbWVzLzEzMTMzMjUzMTgiOnsibmFtZSI6Itij2YXYp9mGIn0sInRoZW1lcy8xOTUzMDM3Nzg3Ijp7Im5hbWUiOiLYsdmK2KrYsdmIIn0sInRoZW1lcy8xNTE1NzM0NzEwIjp7Im5hbWUiOiLZh9mG2KcifSwidGhlbWVzLzE0ODI1MTgzOTYiOnsibmFtZSI6Itio2KfZitix2YTZitmGIn0sInRoZW1lcy8xMTIxNDE0NDU0Ijp7Im5hbWUiOiLYqtix2YEifSwidGhlbWVzLzEyNDU5NTIwMiI6eyJuYW1lIjoi2YPZhNin2LPZitmDIn0sInRoZW1lcy8xNTI0NzMzMTQ4Ijp7Im5hbWUiOiLZiNi02KfYrSJ9LCJ0aGVtZXMvMTEwMDIzOTM3OSI6eyJuYW1lIjoi2LPZitix2YoifSwidGhlbWVzLzg5NDA4NTgxMiI6eyJuYW1lIjoi2LPZitmG2KoifSwidGhlbWVzLzE2MDAzMjYyNzUiOnsibmFtZSI6ItmI2KzZh9ipIn0sInRoZW1lcy84NjczMjU1MDkiOnsibmFtZSI6Iti52KjZgiJ9LCJ0aGVtZXMvNTM4ODU2NTY1Ijp7Im5hbWUiOiLYo9ir2YrZhtinIn0sInRoZW1lcy8xMzc5MDk0MTI3Ijp7Im5hbWUiOiLYrNix2KfZiiJ9LCJ0aGVtZXMvMjE0MDM5NDYxNCI6eyJuYW1lIjoi2YXZhNmK2YPYqSJ9LCJ0aGVtZXMvMTUxNDgxODgyMiI6eyJuYW1lIjoi2LHZitio2YgifSwidGhlbWVzLzQxNjIwOTc0NCI6eyJuYW1lIjoi2LPZgdix2KkifSwidGhlbWVzLzE4ODY2NjM2MjgiOnsibmFtZSI6Itiq2YXZitiyIn0sInRoZW1lcy8xMzQ5ODg4NjkwIjp7Im5hbWUiOiLZgdin2KrZhiJ9LCJ0aGVtZXMvNjYzMDU2MzU0Ijp7Im5hbWUiOiLYrNmI2YfYsdipIn0sInRoZW1lcy8xNjY2MjYyNDkiOnsibmFtZSI6ItmD2KfZg9in2YgifSwidGhlbWVzLzExNTUxOTIyMjgiOnsibmFtZSI6ItmG2KfZitinIn0sInRoZW1lcy8xNTY4MjI0MDQ3Ijp7Im5hbWUiOiLYqNmGIn0sInRoZW1lcy85NjMyMzYwNzAiOnsibmFtZSI6ItmG2LPZitisIn0sInRoZW1lcy8xNTQxNzc1OTQ2Ijp7Im5hbWUiOiLYqtiz2KfZhNmKIn0sInRoZW1lcy84NDQzNzkyNjIiOnsibmFtZSI6Itiz2YPYsSJ9LCJ0aGVtZXMvNjk3OTU1OTU4Ijp7Im5hbWUiOiLYsdmK2KfZhiJ9LCJ0aGVtZXMvMjY0Mjk0ODM3Ijp7Im5hbWUiOiLYp9mB2YIifSwidGhlbWVzLzU4NzA4NTEyIjp7Im5hbWUiOiLYqtix2KfapNmIIn0sInRoZW1lcy82MjYyMzI0ODUiOnsibmFtZSI6Itis2YjYsdmKIn0sInRoZW1lcy8xMTMzMDI3NzU0Ijp7Im5hbWUiOiLZhtmC2YoifSwidGhlbWVzLzI1ODM5OTU4MCI6eyJuYW1lIjoi2KPZhNmI2KfZhiJ9LCI0YjBhMjliNy01ZTc1LTQwMWYtYWVlNy1lZTMzMTY4MjBiMjYiOnsibmFtZSI6Iti02YjZgdin2YoifSwiZjlmMDkxNGQtM2M1OC00OTNiLWJkODMtMjYwZWQzY2I0ZTgyIjp7Im5hbWUiOiLYs9mI2YHYqiJ9LCI4YmE2YWUyNi0zMmVhLTQyNzEtODFiMi0wZDlkNjgwNGE0NzMiOnsibmFtZSI6Ikin2LTYsdin2YIifSwiMjBlMTBkZDUtY2Y5ZC00YTZjLTg3ZDMtYmZlY2Q1YTdiNGQ2Ijp7Im5hbWUiOiLYutiz2YIifSwiYWRhMjQ4ZmQtYTk2NC00MGIwLTk5YWItMGEzYzZkMzE2Zjg4Ijp7Im5hbWUiOiLYsdin2YbYp9mI2KfZiiJ9LCI4ZjEzOTBhNS04OWQ3LTRlZTgtYWQ2YS0yMWVlOWRkNTEwM2IiOnsibmFtZSI6Itis2KfZhdinIn0sIjFkZmM0MWFmLWIyODgtNDNmNC1iZWRmLWQyZGU5NzRlY2Q4MCI6eyJuYW1lIjoi2KzYp9mF2KcifSwiMWViNmJiNDYtMWMxNC00YTVkLWIxMWQtN2MzMjlhOTk4NWI2Ijp7Im5hbWUiOiLZhNmI2YPYsyJ9LCJmZDI0MmNiNS0xMDAzLTQ1MjYtOGVhMC1iMjEyNGQxYTdmMmUiOnsibmFtZSI6Itiq2YXZitiyICjYp9it2KrYsdin2YHZiikifSwiNDk3NGJhMzctYjQ5MC00M2I2LWI0YWItMTg4ZTc0NDk0YWUyIjp7Im5hbWUiOiLYr9in2LHZgyJ9LCI0MTk4OTc5MS04MTgwLTQxYzUtYjY4Yy00YjU3ZDEyMzc2MmUiOnsibmFtZSI6ItmE2YjZgdmK2LLYpyJ9LCIyZDNhODc4Ni00MjgyLTQ5NTEtYjBlZC1jYjlhMWY4MzU1ODYiOnsibmFtZSI6Itix2YjZhNiyIn0sIjVhYzhiZmYwLTg2ZDYtNGNiZS04NDJiLWM3ZDg1M2ZiMTRlYyI6eyJuYW1lIjoi2KfYqNiq2YPYp9ixIn0sIjJlZTUxNmY1LTliYzctNDg5NS1iMzljLWI1NDg2NWUzNmU5MyI6eyJuYW1lIjoi2KfZhNij2LXYp9mK2YQifSwiMzA3MWQwODYtZTdlMS00MDQzLTllY2ItNWZlMWQxYzM0MDViIjp7Im5hbWUiOiLYp9mE2KPYtdin2YrZhCJ9LCJmOGFkNTJmNi1lNmNmLTRiMWYtOTYwNS1lMWNmM2JiMGZlZTUiOnsibmFtZSI6ItmC2LXYtSJ9LCJhNzI0NjczMS05NWI5LTQ1YWMtYjAzZi1kOWU5ODFiNTdkYjQiOnsibmFtZSI6Ikin2YTZhdmE2YPZiiJ9LCI1YTIyNTYxMy04YTM1LTQ2OTItODM0OC01MTdlYTJiOThiN2IiOnsibmFtZSI6Itio2YTZiNixIn0sImZkMTFhMjg3LWMxOWUtNDk3Ny1hZGNkLWU5MThjZWMxYWZkYiI6eyJuYW1lIjoi2LPYqtin2YrZhCJ9LCIyZjJhZjIwYS1mOWU4LTQ2OGQtYTJjZS1jYWZlYzJiNGY1MTEiOnsibmFtZSI6Itix2YLZhdmKIn0sIjI2ZjQ4YThiLTllNGUtNDJjNC1hZTAwLTJiZTZhODRmM2E3YyI6eyJuYW1lIjoi2LHZj9mC2YoifSwiZjBmNDE2NWMtNzNjMi00MWQ4LTgxN2ItNjBiZDA4MDRlZTRjIjp7Im5hbWUiOiLYstmK2KfYr9ipIn0sIjJkMmI1ZTg5LWNiZDctNDIxMS1hYThmLTY5ZWFhMmY3MTIxZiI6eyJuYW1lIjoi2YPZitin2YYifSwiMTYyMzExMzMtMDlmYS00ZWU1LThkY2UtNDhlZmMwNTkwYjI0Ijp7Im5hbWUiOiLZg9mK2KfZhiJ9LCJmOTUxZTRjNy1mYjJkLTRhNDktODBlMS1lYzRlMGQ4YjIzYWEiOnsibmFtZSI6ItmE2KTZhNikIn0sIjliM2M3NmZmLTk4ODEtNDk1Yi1hOTVhLTBlMzM1NmUwNzE4YiI6eyJuYW1lIjoi2YHZiNmI2K8g2KrZiNioIn0sImVmNmE1ZTQwLTE5NzQtNGJhOS1iNmEwLTA0NDNlMDljZDVmYyI6eyJuYW1lIjoi2LHZitizIn0sIjkwNTY1ODQyLWMwMjQtNDIzMi1hMzY5LTdhZGRmYzQ1YmY5OSI6eyJuYW1lIjoi2KjZg9iz2YTYqSJ9LCIwNDc1ZTMzZi1kZTczLTRkMTAtYmViOS1hZGIzOWYwNTM3MDkiOnsibmFtZSI6ItmC2YjZhNiv2YYifSwiMzVlYzI2ZjctNTQ4MC00YWY3LTljMGQtNjVhZjExMmIyZjk2Ijp7Im5hbWUiOiLZhdmI2LHZgSJ9LCI5NTE4ODNkZi03MWM1LTQ4ZTUtOGE3Zi0wM2RjZTA2YjMwMTEiOnsibmFtZSI6Itio2LHZitmCIn0sImY2ZWI1NDA5LTAxNTgtNDk3NC04MmJjLTQ0ZTc5NzI4YTViYSI6eyJuYW1lIjoi2KfZhNmD2KrYsdmIIn0sIjdlMzMwYjlkLWJmNzMtNDViMy04M2Q3LTJmNjRlNjNjMDU3ZiI6eyJuYW1lIjoi2KzZhNin2YXZiNixIn0sImJmN2M0NGFhLWEzZDUtNDczOS05OGU5LTJlZjc3MDFmMTYyOSI6eyJuYW1lIjoi2KjZitiz2KfZhiJ9LCIyMzk2OGJiNS1kOGY5LTQ5ZjMtODFmMS1lN2U0ZDU0MzIyZGEiOnsibmFtZSI6Ikin2YjYsdis2KfZhtmK2YMifSwiOWMyZmQ5MDYtZmI3ZC00YTcxLTljZGEtMWY4MjU4MDA4NWY5Ijp7Im5hbWUiOiLYq9mK2YUg2LLZhdix2K8ifSwiZThlMWVkNGYtODY4My00NmJlLThiMzItM2ExODZhNGZiNWU3Ijp7Im5hbWUiOiLZgdmK2LHYrNmGNCJ9LCJlZDZlZmJhOS03Y2UzLTQ0ZjAtOWUwOS1jY2ZhNzAyMjI3MjIiOnsibmFtZSI6Itit2LPYp9mFIn0sIjNjZGZlNzUwLTViMzItNDgyNy05MGZlLWQzZmViY2MzODIwMCI6eyJuYW1lIjoi2KfYsdmK2YPYqSJ9LCJjMzEwMDZmYi1kMTFkLTQ2ZDEtYjJkNy1lYTkyZGMxZDk4N2IiOnsibmFtZSI6Itix2YrZiCJ9LCJjNmFjZWU1Zi1hNGFlLTRjYzAtYjNjMC02ODAzZDljNjQ5OWIiOnsibmFtZSI6Itio2YrYqtizIn0sImFmMDA0MzVkLTQ4NTEtNGIxZi1iMTU2LTQ1YmJmNTdlYTNkOSI6eyJuYW1lIjoi2LPYqNmI2LHYqtmB2KfZiiJ9LCJhZWRmZDk0Yy1lMTZlLTQ1MTItOGE3YS0xODc1NzhiMmJiOTIiOnsibmFtZSI6Itir2YrZhSDYsdmC2YrYqSJ9LCJiYTVhNmM4OC0wNGU1LTQzODUtODJiYy0zMTUxNDIzMjAyOWEiOnsibmFtZSI6Itil2KjYsdin2YIifSwiNzVkMDNhMDktMmFlMi00MGY0LWI3MzUtZWUxZjhiZDExZGEzIjp7Im5hbWUiOiLZgdix2K0ifSwiYTg0Zjk1OWQtMzllZC00ZTAwLWIyMWYtNmMxMDFmZTEyMmNlIjp7Im5hbWUiOiLYrNmE2YjYqNmJIn0sIjQ0MjEzMTgyLWM0NzgtNDFiNi04NDFiLWM2ZDJmZmZlNmJlMyI6eyJuYW1lIjoi2YXZiNisINin2YTYudmI2K8ifSwiN2VhZDk1YWYtOTM4Yi00Y2ZlLTkyYjItYTA4YjRiOTIwNjkyIjp7Im5hbWUiOiLYudin2YTZhSDYp9mE2KPYq9in2KsifSwiMmRiZmI3YjItODZmMS00M2Q3LTljYWEtN2Q5OWE5MDIzNDQyIjp7Im5hbWUiOiLYo9mE2YHYpyJ9LCI4ZmJlY2IzOC0xZDJhLTRjYTgtOTRlMi1kYzFhNmZjMGI3NDAiOnsibmFtZSI6Itij2YTZgdinIn0sIjUxODgzNWUyLWU1ZmItNDdlMS05MWM5LTNhYTliNmFlYTlhOSI6eyJuYW1lIjoi2KfZhNij2YXZhCJ9LCI1ZGRjZGIxZS1kODllLTRkZjYtYjUyZS03MjUwYzgxNGU4YzAiOnsibmFtZSI6ItmB2YjYr9mKIn0sImU3NTE2ZDczLWQ5YzMtNDI5Ni1iMmZjLTExODBiMzY2MDk3ZSI6eyJuYW1lIjoi2LHZiti62KfZhNmIIn0sIjg2YjRkZDY0LWRiYzQtNDkwOC1iN2E4LWE2NjkzNzZhOGZhNyI6eyJuYW1lIjoi2YXYqtis2LEg2KrYsdmG2K/ZiiJ9LCI2NWE5M2I5MS00OGUyLTQ2MGItYjI3My04ZGI0OTU5NzJjNjMiOnsibmFtZSI6Itio2K/Yp9mK2KkifSwiYzkzYTE2YWItYzI3Mi00MmEyLWIyYjEtODJkZDY2ZGNkZDU0Ijp7Im5hbWUiOiLYs9mA2YDZgNmA2YDZhtmI2LEifSwiNDQzMDM1YTAtOWZlOS00MTA1LWFiOGEtNWVhZjc4OWJlNWMyIjp7Im5hbWUiOiLYqtmD2YbZiNmE2YjYrNmKINiq2YjYqCJ9LCIzNTVjNWJlZS0yMDBmLTQ0ZmQtYjBjYi05MGZlNjcwNDNhYzUiOnsibmFtZSI6ItmF2LDYp9mCIn0sImJiNDE0OWMxLWVlODItNDU4ZC05N2MwLWJhMDcwOTJmMDIxOCI6eyJuYW1lIjoi2YTZiNmD2LTYsdmKIn0sImFkY2RhYmYyLWQ2ZjEtNDE5NC05ZDQxLTdiOGY1YzU0NTMwMiI6eyJuYW1lIjoi2YHYsdmK2LQg2YXYp9ix2KoifSwiZjcxOTk5ZTgtZTViMi00ZWRhLWJiN2MtZjE2YWNhOTQ0ZjU2Ijp7Im5hbWUiOiLYp9mE2LHYp9im2K8ifSwiOTdlMDk4MzgtNzkwNy00NmVkLTlkNTktMTUwZDVhYzk1NWUyIjp7Im5hbWUiOiLZitin2LPZhdmK2YYifSwiNDJkMzk1NzMtYmJiNS00N2M0LWE1ZWUtMjQ0MWUxODVhMzM2Ijp7Im5hbWUiOiLYsdmI2YbZgNmA2YIifSwiY2ZkMzZkNjktMDk5Ny00MmExLTkyMzktMWE2NzNmMjEyNDY1Ijp7Im5hbWUiOiLYrdmD2KfZitipIn0sIjI2MDJlOTdhLTI2YjUtNGI2OC1iYzRmLWQ4NWRiMzMyYWQ0OCI6eyJuYW1lIjoi2KvZitmFINi62YTZiCJ9LCJjYjczNmNlNC04OTE4LTRhNGQtYWQ4YS04MmIyM2MwMGY4MzAiOnsibmFtZSI6Itix2YrYs9io2YjZhiJ9LCI2NGIzZDE0MS0zMzlkLTRmMjMtYmJkMy05YzdmMjJjNmMzOTMiOnsibmFtZSI6ItmB2KfYs9iqIn0sIjJhYzQ5ZGFmLWJmOWUtNDJjZi1iMjVkLTk3OTc5ZTVkZWFiYyI6eyJuYW1lIjoi2KfZhNix2YrYp9i22YoifSwiNmQ3MTFlMzEtOTExMC00YjEyLTgxN2EtOGI4ZjdmYTIwYTI2Ijp7Im5hbWUiOiLYqNmA2YDZgNmA2YDZgNmA2KfYsdmCIn0sIjg2MWY3Yjg2LTg3Y2ItNDU0My04NmRjLWI2OTE3NjNkMWEwOSI6eyJuYW1lIjoi2KjYp9ix2YrYs9iq2KcifSwiMDUwNDNjNzItMTExYi00YjExLWJjNjgtOWFmOWU4YmE2MDRlIjp7Im5hbWUiOiLZgdin2LTZhiJ9LCI0MzFiNzIzOS1jZjkyLTQyMjAtOWIwMC0xZDY2ZGEwNDc0ZmMiOnsibmFtZSI6Itiy2YrZhtipIn0sIjFiNmI4NDg5LWM2ZmUtNDcxYS04N2EwLTM5ZTY2OTNiNTFhMCI6eyJuYW1lIjoi2LLZh9ix2KkifSwiZjNiZjBjZTYtZGVhMi00YWQ0LWFiN2ItMDQxNWRlYWY3Mzc2Ijp7Im5hbWUiOiLYqtix2KfYqyJ9LCJjMDNiMzYxMi02OTFjLTQyY2UtYTVkYi0xZjkxODg1MDY5MTMiOnsibmFtZSI6ItmF2YbZgdix2K8ifSwiMjBlZDI5NGItYzkwYy00ZTAyLWIzOTMtOGQ4MWMzYmU3ZmM4Ijp7Im5hbWUiOiLZgdix2LPYqiDYp9mE2LDZh9io2YoifSwiOTAwZDc1MzgtZGFlYi00NTI5LWE5YTktZTZjODM1MDVlYzUyIjp7Im5hbWUiOiLYsdmI2LLZitinIn0sIjliNTIxNWMwLTljMzEtNDNhOC1iMWU3LTc5NmU2NTljYWQyMSI6eyJuYW1lIjoi2LPYqtix2KkifSwiYTgzOTkyYzUtMWFmNS00ZjU0LWE0MjctNTJiZThkNTgwZmQwIjp7Im5hbWUiOiLYsdmI2YrYp9mEIn0sImZiZWY1ZjVjLTBhMDQtNGZkMy04ZDFlLThjYjk2ODdmODdhOSI6eyJuYW1lIjoi2YLZhNmI2LHZiiJ9LCI0ODNlN2RiMy1mMTM4LTQwYWEtYTljNC0wNmQzM2Q2MGFlMzIiOnsibmFtZSI6Ikin2YTZhdir2KfZhNmKIn0sIjA0YWRmMWU2LWQwNzQtNGRlMS1hOWNiLTliNjkwYTcyZWM0NyI6eyJuYW1lIjoi2K3Ys9in2YUifX0=';
    return JSON.parse(Buffer.from(enc, 'base64').toString('utf-8'));
  } catch { return {}; }
})();

// ─── Security Helpers ─────────────────────────────────────────────────────────
const _BLOCKED_PORTS = new Set([21, 22, 23, 25, 53, 110, 143, 445, 587, 465, 3306, 5432, 27017, 6379]);

function validateStoreUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'البروتوكول يجب أن يكون http أو https';
    if (u.port && _BLOCKED_PORTS.has(parseInt(u.port))) return 'المنفذ غير مسموح به';
    const h = u.hostname.toLowerCase();
    if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|::1|169\.254\.)/.test(h)
      || h === '0' || h.endsWith('.local') || h.endsWith('.internal')) return 'الرابط غير مسموح به';
    return null;
  } catch { return 'رابط غير صالح'; }
}

// ─── Analyzer Cache ───────────────────────────────────────────────────────────
db.query(`CREATE TABLE IF NOT EXISTS analyzer_cache (
  cache_key VARCHAR(64) PRIMARY KEY,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
)`).catch(() => {});

setInterval(() => db.query('DELETE FROM analyzer_cache WHERE expires_at < NOW()').catch(() => {}), 3600000);

// طلبات أداة "مسار التاجر" — تصل للأدمن بكل تفاصيل اختيارات التاجر
db.query(`CREATE TABLE IF NOT EXISTS merchant_path_submissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  mode VARCHAR(20) NOT NULL,
  readiness_score INTEGER,
  performance_health INTEGER,
  readiness_label VARCHAR(40),
  contact VARCHAR(120),
  details JSONB,
  gaps JSONB,
  recommended JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`).catch(() => {});

function _cacheKey(storeUrl, category) {
  const raw = storeUrl.toLowerCase().trim() + '|' + (category || '').toLowerCase().trim();
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function getCached(storeUrl, category) {
  try {
    const { rows } = await db.query(
      'SELECT result FROM analyzer_cache WHERE cache_key=$1 AND expires_at > NOW()',
      [_cacheKey(storeUrl, category)]
    );
    return rows[0]?.result || null;
  } catch { return null; }
}

async function setCached(storeUrl, category, result) {
  try {
    await db.query(
      `INSERT INTO analyzer_cache(cache_key,result,expires_at) VALUES($1,$2,NOW()+INTERVAL '24 hours')
       ON CONFLICT(cache_key) DO UPDATE SET result=$2,expires_at=NOW()+INTERVAL '24 hours',created_at=NOW()`,
      [_cacheKey(storeUrl, category), result]
    );
  } catch { /* non-fatal */ }
}

function sanitizeForPrompt(str, maxLen = 500) {
  if (!str) return '';
  return String(str)
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/```/g, "'''")
    .trim()
    .slice(0, maxLen);
}

// ─── Store Scraper ────────────────────────────────────────────────────────────
async function scrapeStore(url, htmlOverride = null) {
  try {
    let html, resHeaders;
    if (htmlOverride) {
      html = htmlOverride;
      resHeaders = {};
    } else {
      const resp = await axios.get(url, {
        timeout: 18000,
        maxRedirects: 6,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
        },
      });
      html = resp.data;
      resHeaders = resp.headers;
    }

    const $ = cheerio.load(html);
    const low = html.toLowerCase();

    // ── Meta & title ──────────────────────────────────────────────────────────
    const _stripIcons = t => (t||'').replace(/\b[a-zA-Z]+\d+\b/g, '').replace(/\s{2,}/g,' ').trim();
    const pageTitle    = _stripIcons($('title').text());
    const metaDesc     = $('meta[name="description"]').attr('content') || '';
    const ogTitle      = $('meta[property="og:title"]').attr('content') || '';
    const ogDesc       = $('meta[property="og:description"]').attr('content') || '';
    const canonical    = $('link[rel="canonical"]').attr('href') || url;
    const generator    = $('meta[name="generator"]').attr('content') || '';
    const lang         = $('html').attr('lang') || 'غير محددة';
    const themeColor   = $('meta[name="theme-color"]').attr('content') || '';

    // ── All script srcs & link hrefs ──────────────────────────────────────────
    const scripts = [];
    $('script[src]').each((_, el) => scripts.push($(el).attr('src') || ''));
    const links = [];
    $('a[href]').each((_, el) => links.push($(el).attr('href') || ''));
    const allLinks = links.join(' ');

    // ── Platform detection ────────────────────────────────────────────────────
    const pageContent = html + scripts.join(' ');
    let platform = 'غير محدد';
    let isSalla = false, isZid = false;

    if (/cdn\.salla\.sa|salla-cdn|salla\.(sa|store|net)|assets\.salla\.|salla\.network/i.test(pageContent)) {
      platform = 'سلة'; isSalla = true;
    } else if (/media\.zid\.store|assets\.zid\.store|zid-store|zid\.(sa|store)|cdn\.zid\./i.test(pageContent)) {
      platform = 'زد'; isZid = true;
    } else if (/shopify|myshopify\.com|cdn\.shopify|\/cdn\/shop\/t\/\d+\/assets\//i.test(pageContent)) {
      platform = 'Shopify';
    } else if (/woocommerce|wp-content\/plugins\/woo/i.test(low)) {
      platform = 'WooCommerce (WordPress)';
    } else if (/\/static\/version\d+\/frontend\/|magento|mage\./i.test(pageContent)) {
      platform = 'Magento';
    } else if (/cdn11\.bigcommerce\.com|bigcommerce/i.test(pageContent)) {
      platform = 'BigCommerce';
    } else if (/catalog\/view\/theme\/|opencart/i.test(pageContent)) {
      platform = 'OpenCart';
    } else if (/expandcart\.com/i.test(pageContent)) {
      platform = 'ExpandCart';
    } else if (/static\.wixstatic\.com/i.test(pageContent)) {
      platform = 'Wix';
    } else if (/static1\.squarespace\.com/i.test(pageContent)) {
      platform = 'Squarespace';
    } else if (/youcan\.shop|youcan-cdn/i.test(pageContent)) {
      platform = 'YouCan';
    } else if (/matajer\.com/i.test(pageContent)) {
      platform = 'Matajer';
    } else if (generator) {
      platform = generator;
    }

    // ── Theme detection ────────────────────────────────────────────────────────
    let themeName = null;
    let themeCode = null;
    if (isSalla) {
      const m = html.match(/themes\/(\d+)/);
      if (m) {
        themeCode = 'themes/' + m[1];
        themeName = SALLA_ZID_THEMES[themeCode]?.name || null;
      }
    } else if (isZid) {
      const mv = html.match(/THEME_VERSION_ID\s*=\s*["']([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})["']/i);
      const ma = html.match(/assets\.zid\.store\/themes\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      const uuid = mv?.[1] || ma?.[1];
      if (uuid) {
        themeCode = uuid;
        themeName = SALLA_ZID_THEMES[uuid]?.name || null;
      }
    }

    // ── Payment methods — search in full HTML + ALL image attrs + lazy-src + SVG + footer text ──
    const imgSrcAlts = [];
    $('img, source').each((_, el) => {
      imgSrcAlts.push($(el).attr('src')           || '');
      imgSrcAlts.push($(el).attr('data-src')      || '');
      imgSrcAlts.push($(el).attr('data-lazy-src') || '');
      imgSrcAlts.push($(el).attr('data-original') || '');
      imgSrcAlts.push($(el).attr('srcset')        || '');
      imgSrcAlts.push($(el).attr('alt')           || '');
      imgSrcAlts.push($(el).attr('title')         || '');
    });
    // SVG sprite <use href="..."> + all data-* attrs that might carry payment names
    $('[data-payment],[data-method],[data-name],[data-type],[data-key],[aria-label],[title]').each((_, el) => {
      ['data-payment','data-method','data-name','data-type','data-key','aria-label','title'].forEach(a => {
        imgSrcAlts.push($(el).attr(a) || '');
      });
    });
    $('use').each((_, el) => imgSrcAlts.push($(el).attr('href') || $(el).attr('xlink:href') || ''));
    // Inline script content — catches Salla/Zid JSON configs with payment method lists
    const inlineScripts = [];
    $('script:not([src])').each((_, el) => {
      const t = $(el).html() || '';
      if (t.length < 80000) inlineScripts.push(t);
    });
    // Payment/footer area text content (catches text-rendered payment names)
    const paymentAreaText = $('[class*="payment"],[class*="footer"],[id*="payment"],[id*="footer"],[class*="method"],[class*="gateway"],[class*="checkout"]').text();
    const paySearchStr = html + ' ' + imgSrcAlts.join(' ') + ' ' + paymentAreaText + ' ' + inlineScripts.join(' ').slice(0, 50000);

    const paymentMap = {
      'مدى':                  [/\bmada\b/i, /مدى/, /mada[-_]?pay/i],
      'فيزا':                 [/\bvisa\b/i, /فيزا/, /visa[-_]card/i, /cc-visa/i, /"visa"|'visa'|visa[,\]}"'\s]/i, /payment.*visa|visa.*icon/i],
      'ماستركارد':            [/mastercard/i, /master[\s\-_]*card/i, /ماستركارد|ماستر.?كارد/i, /"mastercard"|'mastercard'|mc[-_]?icon/i],
      'STC Pay':              [/stc[\s_-]?pay|stcpay|stcbank/i],
      'Apple Pay':            [/apple[\s_-]?pay|applepay/i],
      'تابي':                 [/\btabby\b|tabby[\s_-]?ai|checkout[\s_-]?tabby|tabby\.ai/i],
      'تمارا':                [/\btamara\b|tamara[\s_-]?co|cdn\.tamara/i],
      'PayPal':               [/\bpaypal\b/i],
      'Moyasar':              [/\bmoyasar\b/i],
      'HyperPay':             [/hyperpay/i],
      'PayTabs':              [/paytabs/i],
      'Tap Payments':         [/tap[\s-]?payment|\bgosell\b/i],
      'Stripe':               [/\bstripe\b|js\.stripe\.com/i],
      'الدفع عند الاستلام':  [/cash[\s-]?on[\s-]?delivery|\bcod\b|الدفع عند الاستلام|cash_on_delivery|pay_on_delivery/i],
      'تحويل بنكي':          [/bank[\s-]?transfer|تحويل بنكي/i],
      'مدفوع':               [/\bmadfoo3\b|مدفوع\.com/i],
    };
    const paymentMethods = Object.entries(paymentMap)
      .filter(([, pats]) => pats.some(p => p.test(paySearchStr)))
      .map(([name]) => name);

    // أيقونة بطاقات الائتمان كثيراً ما تكون صورة واحدة مدمجة (فيزا+ماستر) باسم عام
    // فلا تُكتشف بالاسم — نستدلّ عليها من صور منطقة الدفع/الفوتر فقط (لتفادي إيجابيات خاطئة)
    const payZoneImgs = [];
    $('footer img, footer source, [class*="payment" i] img, [class*="method" i] img, [class*="checkout" i] img, [id*="footer" i] img, [id*="payment" i] img').each((_, el) => {
      ['src', 'data-src', 'data-lazy-src', 'data-original', 'srcset', 'alt', 'title'].forEach(a => payZoneImgs.push($(el).attr(a) || ''));
    });
    const payIconStr = payZoneImgs.join(' ') + ' ' + paymentAreaText;
    const creditCardHint = /credit[\s_-]?cards?|creditcard|بطاقات?\s*الائتمان|بطاقة\s*ائتمان|visa[\s_-]?master|master[\s_-]?visa|payment[\s_-]?cards?|\bcards?\.(?:png|svg|webp|jpe?g)|major[\s_-]?cards?/i.test(payIconStr);
    if (creditCardHint) {
      if (!paymentMethods.includes('فيزا')) paymentMethods.push('فيزا');
      if (!paymentMethods.includes('ماستركارد')) paymentMethods.push('ماستركارد');
    }
    // سداد (أيقونة خضراء شائعة في المتاجر السعودية)
    if (/\bsadad\b|سداد|sa3ad/i.test(paySearchStr) && !paymentMethods.includes('سداد'))
      paymentMethods.push('سداد');

    // ── Social media — search in all href attributes + full HTML ─────────────
    const allHrefs = [];
    $('a[href]').each((_, el) => allHrefs.push($(el).attr('href') || ''));
    const socialSearchStr = allHrefs.join(' ') + ' ' + html;

    const socialPatterns = {
      Instagram:   /instagram\.com\/(?!p\/|reel\/|explore\/|accounts\/|stories\/)([a-zA-Z0-9_.]{2,})/,
      'Twitter/X': /(?:twitter|x)\.com\/(?!intent|share|home|i\/)([a-zA-Z0-9_]{2,})/,
      TikTok:      /tiktok\.com\/@?([a-zA-Z0-9_.]{2,})/,
      Snapchat:    /snapchat\.com\/(?:add\/|ar\/)?([a-zA-Z0-9_.]{2,})/,
      YouTube:     /youtube\.com\/(?:channel\/|@|user\/|c\/)([^"'\s/?#]{2,})/,
      Facebook:    /facebook\.com\/(?!share|sharer|dialog|watch|story)([a-zA-Z0-9_.]{2,})/,
      WhatsApp:    /(?:wa\.me\/|whatsapp\.com\/send[^"'\s]*|api\.whatsapp\.com\/send[^"'\s]*)/,
      Telegram:    /(?:t\.me|telegram\.(?:me|org))\/(?!joinchat)[a-zA-Z0-9_]{2,}/,
      LinkedIn:    /linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]{2,}/,
    };
    const socialLinks = {};
    for (const [name, pat] of Object.entries(socialPatterns)) {
      const m = socialSearchStr.match(pat);
      if (m) socialLinks[name] = m[0];
    }

    // ── Technologies ──────────────────────────────────────────────────────────
    const techMap = {
      'Google Analytics':     [/google-analytics|gtag\.js|analytics\.js/i],
      'Google Tag Manager':   [/googletagmanager|gtm\.js/i],
      'Facebook Pixel':       [/fbq\(|facebook\.net\/.*fbevents/i],
      'TikTok Pixel':         [/\bttq\b|tiktok.*pixel|analytics\.tiktok/i],
      'Snapchat Pixel':       [/snapchat.*pixel|scevent\.js/i],
      'Twitter Pixel':        [/twq\(|static\.ads-twitter/i],
      'Hotjar':               [/hotjar/i],
      'Crisp Chat':           [/crisp\.chat|client\.crisp/i],
      'Tidio':                [/code\.tidio\.co/i],
      'Zendesk':              [/zendesk|zopim|static\.zdassets\.com/i],
      'Intercom':             [/intercom|widget\.intercom\.io/i],
      'تمارا':                [/tamara\.co|cdn\.tamara\.co/i],
      'تابي':                 [/tabby\.ai|checkout\.tabby\.ai/i],
      'Klaviyo':              [/static\.klaviyo\.com/i],
      'Mailchimp':            [/chimpstatic\.com|mailchimp\.com/i],
      'Microsoft Ads':        [/bat\.bing\.com/i],
      'jQuery':               [/jquery[.-]\d/i],
      'Swiper':               [/swiper(?:\.min)?\.js/i],
      'React':                [/react(?:\.min)?\.js|__reactFiber|data-reactroot/i],
      'Vue.js':               [/vue(?:\.min)?\.js|data-v-[0-9a-f]+/i],
      'Cloudflare':           [/cloudflare/i],
      'رمز Schema.org':       [/schema\.org/i],
      'Open Graph':           [/<meta property="og:/i],
      'AMP':                  [/\bamp\b.*html|<html amp/i],
    };
    const technologies = Object.entries(techMap)
      .filter(([, pats]) => pats.some(p => p.test(html)))
      .map(([name]) => name);

    // ── SEO signals ───────────────────────────────────────────────────────────
    // cleanTxt: removes icon-font fragments like "star2", "cancelstar2", "checkmark1" etc.
    const cleanTxt = t => t.replace(/\b[a-z]+\d+\b/gi, '').replace(/\s{2,}/g, ' ').trim();
    const h1s = $('h1').map((_, el) => cleanTxt($(el).text())).get()
      .filter(t => t.length > 2 && /[؀-ۿ\w]/.test(t)).slice(0, 5);
    const h2s = $('h2').map((_, el) => cleanTxt($(el).text())).get()
      .filter(t => t.length > 2 && /[؀-ۿ\w]/.test(t)).slice(0, 5);
    const imgsMissingAlt = $('img:not([alt]), img[alt=""]').length;
    const totalImgs = $('img').length;
    const hasRobotsMeta = $('meta[name="robots"]').length > 0;
    const hasStructuredData = $('script[type="application/ld+json"]').length > 0;
    const internalLinks = links.filter(l => l.startsWith('/') || l.includes(new URL(url).hostname)).length;

    // ── UX / Store signals ────────────────────────────────────────────────────
    const hasSSL         = url.startsWith('https');
    const hasSearch      = $('input[type="search"], input[placeholder*="بحث" i], input[placeholder*="search" i]').length > 0;
    const hasLogo        = $('img[alt*="logo" i], img[class*="logo" i], .logo img, header img').length > 0;
    const hasMobileMenu  = $('[class*="hamburger" i],[class*="mobile-menu" i],[class*="nav-toggle" i]').length > 0;
    const hasCart        = low.includes('cart') || low.includes('سلة') || low.includes('عربة');
    const hasWishlist    = low.includes('wishlist') || low.includes('قائمة الرغبات') || low.includes('المفضلة');
    const productImgs    = $('[class*="product" i] img, [class*="item" i] img').length;
    const contactEmail   = (html.match(/[\w.+-]+@[\w-]+\.\w{2,}/g) || []).filter(e => !e.includes('example') && !e.includes('sentry'))[0];
    const phoneMatch     = html.match(/(?:\+966|00966|05\d)\d{7,9}/g);
    const phoneNumbers   = phoneMatch ? [...new Set(phoneMatch)].slice(0, 3) : [];

    // ── Server info ───────────────────────────────────────────────────────────
    const server       = resHeaders['server'] || resHeaders['x-powered-by'] || 'غير محدد';
    const cacheControl = resHeaders['cache-control'] || '';
    const hasCDN       = /cloudflare|fastly|akamai|cloudfront/i.test(JSON.stringify(resHeaders));

    // ── CRO & Conversion signals ──────────────────────────────────────────────
    const hasCountdown      = $('[class*="countdown" i],[class*="timer" i],[id*="countdown" i],[data-countdown]').length > 0;
    const hasUrgencyText    = /محدود.*الكمية|ينتهي.*العرض|باقي.*فقط|only \d+.*left|selling.*fast|متبقي \d+/i.test(html);
    const hasReviewSection  = $('[class*="review" i],[class*="testimonial" i],[itemprop="review"],[class*="rating" i],[class*="stars" i]').length > 0 || /تقييمات.*العملاء|آراء.*المتسوقين/i.test(html);
    const hasTrustBadges    = /ضمان.*100|money.back|مضمون|trusted.*store|دفع آمن|secure.*payment/i.test(html);
    const hasWhatsAppFloat  = $('[href*="wa.me"],[class*="whatsapp" i]').length > 1 || /wa\.me\//i.test(html);
    const hasProductVideo   = $('video source,[class*="product" i] video,iframe[src*="youtube.com/embed"],iframe[src*="vimeo.com"]').length > 0;
    const hasSizeGuide      = /دليل.*المقاسات|جدول.*المقاسات|size.?guide|size.?chart/i.test(html);
    const hasNewsletterForm = $('input[type="email"]').length > 1;
    const lazyLoadedImgs    = $('img[loading="lazy"]').length;
    const hasOGImage        = !!$('meta[property="og:image"]').attr('content');
    const hasReturnPolicy   = /سياسة.*إرجاع|return.*policy|إرجاع.*استبدال|استرداد.*المبلغ/i.test(html);
    const hasShippingBadge  = /شحن مجاني|free.*shipping|توصيل مجاني|free delivery/i.test(html);
    const hasChatWidget     = /crisp\.chat|code\.tidio|zendesk|intercom\.io|tawk\.to/i.test(html);
    const hasBreadcrumb     = $('[class*="breadcrumb" i],[itemtype*="BreadcrumbList"]').length > 0;
    const hasAddToCartBtn   = /add.to.cart|addtocart|أضف.*سلة|اضف.*السلة|اشتر.*الآن/i.test(low) || $('[class*="add-to-cart" i],[class*="addtocart" i]').length > 0;
    const hasPaymentBadgesInFooter = $('footer img[src*="visa" i],footer img[src*="mada" i],footer img[src*="master" i],footer [class*="payment" i]').length > 0;
    const hasQuickView      = /quick.view|quickview|معاينة سريعة/i.test(html);
    const hasCompare        = /compare.*products|مقارنة.*منتجات/i.test(html);

    // ── Saudi trust & legal verification ─────────────────────────────────────
    const hasTaxNumber          = /\b3\d{14}\b/.test(html) || /الرقم الضريبي|رقم ضريبي|tax.?number|vat.?number/i.test(html);
    const _bizSearch = html + ' ' + imgSrcAlts.join(' ');
    const hasBusinessVerification = /منصة الأعمال|المركز السعودي للأعمال|مركز الأعمال|مركز.?الاعمال|saudi[\s_-]?business[\s_-]?center|business[\s_-]?center|وزارة التجارة|موثّق لدى|موثق لدى|mabsat\.sa|mabsat\.com|سجل في منصة/i.test(_bizSearch);
    const hasVATBadge           = /\bVAT\b|ضريبة القيمة المضافة|ض\.ق\.م|القيمة المضافة|ضريبي/i.test(html);
    const hasCommercialReg      = /سجل تجاري|رقم السجل التجاري|commercial.?reg|cr.?number/i.test(html);
    const hasZATCA              = /zatca|هيئة الزكاة والضريبة|fatoora|e-invoice/i.test(html);

    return {
      success: true,
      pageTitle, metaDesc, ogTitle, ogDesc, canonical, generator, lang, themeColor,
      platform, themeName, themeCode, paymentMethods, socialLinks, technologies,
      hasSSL, hasSearch, hasLogo, hasMobileMenu, hasCart, hasWishlist,
      h1s, h2s, imgsMissingAlt, totalImgs, hasRobotsMeta, hasStructuredData,
      internalLinks, productImgs, contactEmail, phoneNumbers,
      server, hasCDN, scriptsCount: scripts.length,
      // CRO & UX (new)
      hasCountdown, hasUrgencyText, hasReviewSection, hasTrustBadges,
      hasWhatsAppFloat, hasProductVideo, hasSizeGuide, hasNewsletterForm,
      lazyLoadedImgs, hasOGImage, hasReturnPolicy, hasShippingBadge,
      hasChatWidget, hasBreadcrumb, hasAddToCartBtn, hasPaymentBadgesInFooter,
      hasQuickView, hasCompare,
      // Saudi trust & legal
      hasTaxNumber, hasBusinessVerification, hasVATBadge, hasCommercialReg, hasZATCA,
      // New v4 signals
      hasCrossedPrice: $('del, s, [class*="old-price"], [class*="was-price"], [class*="original-price"]').length > 0,
      hasDiscountBadge: /\d+%\s*(خصم|off)/i.test(html),
      hasFakeDiscountRisk: (() => { const m = html.match(/(\d+)%\s*(خصم|off)/gi) || []; return m.some(d => parseInt(d) >= 70); })(),
      hasProductGallery: $('[class*="gallery"],[class*="swiper"],[class*="slider"],[class*="carousel"]').length > 0,
      hasProductZoom: /zoom|magnif|lightbox/i.test(html),
      hasProductBadges: $('[class*="badge"],[class*="label"],[class*="tag"]').filter((_,el) => /جديد|new|sale|حصري|best|مميز/i.test($(el).text())).length > 0,
      hasSearchFilter: $('[class*="filter"],[class*="facet"],select[name*="sort"],select[name*="filter"]').length > 0,
      hasCategoryNav: $('nav, [class*="category-nav"]').find('a').length > 4,
      hasLiveSearch: /autocomplete|typeahead|live.search|instant.search/i.test(html),
      hasInfiniteScroll: /infinite.scroll|load.more|lazy.load.*product/i.test(html),
      hasShippingInfo: /مدة.*التوصيل|يوم.*عمل|خلال \d+ أيام|delivery.*\d+.*day/i.test(html),
      hasCODVisibility: /الدفع عند الاستلام|cash on delivery/i.test(html.slice(0, 3000)),
      hasReturnDays: /\d+\s*يوم.*إرجاع|\d+\s*days?.*return/i.test(html),
      hasWhatsAppBusiness: /api\.whatsapp\.com|wa\.me.*text=/i.test(html),
      hasLoyaltyProgram: /نقاط|مكافآت|loyalty|rewards|points|برنامج الولاء/i.test(html),
      hasGiftCards: /بطاقة هدية|gift card|كرت هدية/i.test(html),
      hasMultiCurrency: /usd|sar|aed|kwd|bhd|qar|\$|€|£/i.test(html),
      detectedIndustry: detectIndustry(html, pageTitle, metaDesc, h1s),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── SEO Files (robots.txt + sitemap.xml) ────────────────────────────────────
async function fetchSEOFiles(storeUrl) {
  const base = new URL(storeUrl).origin;
  const result = { hasRobots: false, hasSitemap: false, hasSitemapInRobots: false, robotsAllows: true };
  await Promise.allSettled([
    axios.get(`${base}/robots.txt`, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      .then(r => {
        result.hasRobots = r.status === 200 && typeof r.data === 'string' && r.data.length > 10;
        result.hasSitemapInRobots = /sitemap:/i.test(r.data || '');
        result.robotsAllows = !/disallow:\s*\/$/im.test(r.data || '');
      }).catch(() => {}),
    axios.get(`${base}/sitemap.xml`, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0' } })
      .then(r => { if (r.status === 200) result.hasSitemap = true; })
      .catch(() =>
        axios.get(`${base}/sitemap_index.xml`, { timeout: 5000 })
          .then(r => { if (r.status === 200) result.hasSitemap = true; })
          .catch(() => {})
      ),
  ]);
  return result;
}

// ─── Industry Auto-Detection ─────────────────────────────────────────────────
function detectIndustry(html, pageTitle, metaDesc, h1s) {
  // Use title + meta desc + h1s only — avoid using full HTML body (avoids classifying by client examples)
  const content = (pageTitle + ' ' + metaDesc + ' ' + h1s.join(' ')).toLowerCase();
  const map = [
    ['ملابس وأزياء',        /ملابس|عباءة|ثياب|أزياء|fashion|abaya|hijab|مانطو|كوفرة/],
    ['عطور وجمال',          /عطر|بخور|برفان|كريم|مكياج|perfume|fragrance|beauty|skincare|ميك أب/],
    ['إلكترونيات',          /جوال|موبايل|لابتوب|تلفاز|شاشة|phone|laptop|tv|electronic|كمبيوتر|سماعة|هاتف/],
    ['أثاث ومنزل',          /أثاث|كنبة|سرير|طاولة|furniture|sofa|bed|ديكور|مجلس|كرسي|خزانة/],
    ['مواد غذائية',         /أكل|طعام|غذاء|منتجات طبيعية|food|organic|عضوي|تمر|قهوة|عسل|بقالة/],
    ['رياضة ولياقة',        /رياضة|لياقة|gym|sport|fitness|تمرين|كرة|يوغا|معدات رياضية/],
    ['ألعاب وأطفال',        /ألعاب|أطفال|toys|kids|baby|طفل|لعبة|أطفل/],
    ['مجوهرات وإكسسوارات',  /مجوهرات|ذهب|فضة|خاتم|سوار|jewelry|gold|ring|watch|ساعة|قلادة/],
    ['صحة وعناية',          /صحة|دواء|فيتامين|health|pharmacy|supplement|نباتي|علاج/],
    ['قطع غيار',            /قطع غيار|سيارة|محرك|car parts|auto|زيت|إطار|كاوتش/],
    ['مطاعم وكافيه',        /مطعم|كافيه|وجبة|restaurant|coffee|menu|قائمة طعام|مشروب|كافية/],
    ['أدوات ومعدات',        /أدوات|معدات|tools|equipment|حديد|بناء|صناعي/],
    ['كتب وقرطاسية',        /كتب|كتاب|قرطاسية|books|stationery|تعليم|دراسة/],
  ];
  for (const [ind, pat] of map) if (pat.test(content)) return ind;
  return null;
}

// ─── PageSpeed Insights API ───────────────────────────────────────────────────
const clampScore = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

async function fetchPageSpeed(url, _strategy) {
  const key = process.env.PAGESPEED_API_KEY;
  const strategy = _strategy || 'mobile';
  try {
    // المفتاح اختياري — PSI تعمل بدونه بحدّ أقل
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}${key ? `&key=${key}` : ''}`;
    const { data } = await axios.get(endpoint, { timeout: 15000 });
    const cats   = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits    || {};
    const sc = n => (n != null) ? Math.round(n * 100) : null;
    return {
      success: true,
      performanceScore:    sc(cats.performance?.score),
      seoScore:            sc(cats.seo?.score),
      accessibilityScore:  sc(cats.accessibility?.score),
      bestPracticesScore:  sc(cats['best-practices']?.score),
      lcp:         audits['largest-contentful-paint']?.displayValue  || null,
      tbt:         audits['total-blocking-time']?.displayValue       || null,
      cls:         audits['cumulative-layout-shift']?.displayValue   || null,
      ttfb:        audits['server-response-time']?.displayValue      || null,
      fcp:         audits['first-contentful-paint']?.displayValue    || null,
      speedIndex:  audits['speed-index']?.displayValue               || null,
      totalSize:   audits['total-byte-weight']?.displayValue         || null,
      unusedJs:    audits['unused-javascript']?.displayValue         || null,
      renderBlocking: audits['render-blocking-resources']?.details?.items?.length || 0,
      imageOptimized:  (audits['uses-optimized-images']?.score || 0) >= 0.9,
      usesCompression: (audits['uses-text-compression']?.score || 0) >= 0.9,
      passesLazyLoad:  (audits['offscreen-images']?.score || 0) >= 0.9,
    };
  } catch (err) {
    const status = err.response?.status;
    if (status !== 400 && status !== 403) logger.warn(`PageSpeed API failed (${strategy}): ${err.message?.slice(0, 80)}`);
    // لا إعادة محاولة (نعتمد على التقدير الذكي عند الفشل) — توفيراً للوقت
    return { success: false };
  }
}

// تقدير الأداء بالذكاء الاصطناعي عند تعذّر PageSpeed — ليظهر القسم دائماً
async function aiEstimatePerformance(scraped, seoFiles, url) {
  try {
    const sig = {
      platform: scraped.platform || '', scripts: scraped.scriptsCount || 0,
      images: scraped.totalImgs || 0, imgsMissingAlt: scraped.imgsMissingAlt || 0,
      lazyImages: scraped.lazyLoadedImgs || 0, ssl: !!scraped.hasSSL, cdn: !!scraped.hasCDN,
      structuredData: !!scraped.hasStructuredData, sitemap: !!(seoFiles && seoFiles.hasSitemap),
      robots: !!(seoFiles && seoFiles.hasRobots), metaDesc: !!scraped.metaDesc,
      h1: (scraped.h1s || []).length > 0, ogImage: !!scraped.hasOGImage,
    };
    const prompt = `أنت خبير أداء مواقع. قدّر مؤشرات أداء متجر إلكتروني تقديراً واقعياً بناءً على هذه الإشارات التقنية (ليست قياساً فعلياً):
${JSON.stringify(sig)}
قواعد: كثرة السكربتات وعدم تحسين الصور وغياب CDN = أداء أضعف وLCP أعلى. أعد JSON فقط:
{"performanceScore":0-100,"seoScore":0-100,"accessibilityScore":0-100,"bestPracticesScore":0-100,"lcpSec":رقم,"fcpSec":رقم,"speedIndexSec":رقم,"tbtMs":رقم,"ttfbMs":رقم,"cls":رقم_عشري}`;
    const r = await aiGenerate(prompt, 600);
    const n = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
    const sec = (v, d) => `${n(v, d).toFixed(1)} ث`;
    const ms = (v, d) => `${Math.round(n(v, d))} مث`;
    return {
      success: true, estimated: true,
      performanceScore: clampScore(n(r.performanceScore, 50)),
      seoScore: clampScore(n(r.seoScore, 60)),
      accessibilityScore: clampScore(n(r.accessibilityScore, 60)),
      bestPracticesScore: clampScore(n(r.bestPracticesScore, 65)),
      lcp: sec(r.lcpSec, 3.5), fcp: sec(r.fcpSec, 2), speedIndex: sec(r.speedIndexSec, 4),
      tbt: ms(r.tbtMs, 250), ttfb: ms(r.ttfbMs, 600), cls: String(n(r.cls, 0.05)),
      totalSize: null, unusedJs: null, renderBlocking: 0,
      imageOptimized: (scraped.lazyLoadedImgs || 0) > 0,
      usesCompression: !!scraped.hasCDN, passesLazyLoad: (scraped.lazyLoadedImgs || 0) > 0,
    };
  } catch (e) {
    logger.warn(`aiEstimatePerformance failed: ${e.message?.slice(0, 80)} — using heuristic`);
    return heuristicPerformance(scraped);
  }
}

// تقدير حسابي بسيط للأداء (بدون AI) — يضمن ظهور القسم دائماً عند فشل PSI والتقدير الذكي
function heuristicPerformance(scraped) {
  scraped = scraped || {};
  let perf = 72;
  const scripts = scraped.scriptsCount || 0;
  if (scripts > 40) perf -= 18; else if (scripts > 25) perf -= 10; else if (scripts > 15) perf -= 5;
  if ((scraped.totalImgs || 0) > 30 && (scraped.lazyLoadedImgs || 0) === 0) perf -= 10;
  if (scraped.hasCDN) perf += 6;
  if ((scraped.lazyLoadedImgs || 0) > 0) perf += 4;
  perf = clampScore(perf);
  const lcp = perf >= 75 ? 2.4 : perf >= 55 ? 3.6 : 5.2;
  const fcp = perf >= 75 ? 1.4 : perf >= 55 ? 2.2 : 3.4;
  const si = perf >= 75 ? 3.0 : perf >= 55 ? 4.5 : 6.5;
  return {
    success: true, estimated: true,
    performanceScore: perf,
    seoScore: clampScore((scraped.metaDesc ? 20 : 0) + ((scraped.h1s || []).length ? 20 : 0) + 50),
    accessibilityScore: clampScore((scraped.imgsMissingAlt || 0) > 5 ? 65 : 80),
    bestPracticesScore: clampScore(scraped.hasSSL ? 80 : 60),
    lcp: `${lcp.toFixed(1)} ث`, fcp: `${fcp.toFixed(1)} ث`, speedIndex: `${si.toFixed(1)} ث`,
    tbt: `${perf >= 70 ? 180 : 420} مث`, ttfb: '600 مث', cls: '0.05',
    totalSize: null, unusedJs: null, renderBlocking: 0,
    imageOptimized: (scraped.lazyLoadedImgs || 0) > 0,
    usesCompression: !!scraped.hasCDN, passesLazyLoad: (scraped.lazyLoadedImgs || 0) > 0,
  };
}

// ─── Industry Benchmarks ──────────────────────────────────────────────────────
const INDUSTRY_BENCHMARKS = {
  'ملابس':      { avgScore: 62, avgPerf: 54, avgCRO: 44, topScore: 90, label: 'متاجر الملابس والأزياء' },
  'إلكترونيات': { avgScore: 70, avgPerf: 62, avgCRO: 50, topScore: 92, label: 'متاجر الإلكترونيات' },
  'عطور':       { avgScore: 58, avgPerf: 51, avgCRO: 40, topScore: 88, label: 'متاجر العطور والجمال' },
  'جمال':       { avgScore: 61, avgPerf: 53, avgCRO: 47, topScore: 87, label: 'متاجر مستحضرات التجميل' },
  'غذائية':     { avgScore: 55, avgPerf: 50, avgCRO: 38, topScore: 82, label: 'متاجر المواد الغذائية' },
  'أثاث':       { avgScore: 60, avgPerf: 47, avgCRO: 35, topScore: 85, label: 'متاجر الأثاث والديكور' },
  'رياضة':      { avgScore: 64, avgPerf: 57, avgCRO: 42, topScore: 89, label: 'متاجر الرياضة واللياقة' },
  'قطع غيار':   { avgScore: 55, avgPerf: 49, avgCRO: 32, topScore: 80, label: 'متاجر قطع الغيار' },
  'مجوهرات':    { avgScore: 63, avgPerf: 55, avgCRO: 42, topScore: 88, label: 'متاجر المجوهرات والإكسسوارات' },
  'صحة':        { avgScore: 61, avgPerf: 53, avgCRO: 45, topScore: 86, label: 'متاجر الصحة والعناية' },
  'أدوات':      { avgScore: 58, avgPerf: 51, avgCRO: 38, topScore: 83, label: 'متاجر الأدوات والمعدات' },
  'عام':        { avgScore: 60, avgPerf: 54, avgCRO: 42, topScore: 85, label: 'المتاجر الإلكترونية عموماً' },
};

function getIndustryBenchmark(category) {
  if (!category) return INDUSTRY_BENCHMARKS['عام'];
  const key = Object.keys(INDUSTRY_BENCHMARKS).find(k => category.includes(k));
  return key ? INDUSTRY_BENCHMARKS[key] : INDUSTRY_BENCHMARKS['عام'];
}

function calcPercentile(score, avg, top) {
  if (score >= top) return 99;
  if (score <= avg - 20) return Math.max(5, Math.round(((score - (avg - 20)) / 20) * 20));
  if (score <= avg) return Math.round(20 + ((score - (avg - 20)) / 20) * 30);
  return Math.round(50 + ((score - avg) / (top - avg)) * 49);
}

function buildTechnicalChecks(scraped, seoFiles, pageSpeed) {
  const s = {
    hasSSL: false, hasCDN: false, hasStructuredData: false, hasOGImage: false,
    hasRobotsMeta: false, lazyLoadedImgs: 0, totalImgs: 0, h1s: [],
    metaDesc: '', hasSearch: false, hasCart: false, hasMobileMenu: false,
    hasWishlist: false, imgsMissingAlt: 0, scriptsCount: 0, technologies: [],
    ...scraped,
  };
  const checks = [];
  const add = (id, label, pass, warn, value, detail) =>
    checks.push({ id, label, status: pass ? 'pass' : warn ? 'warn' : 'fail', value, detail });

  add('ssl',        'SSL / HTTPS',          s.hasSSL,                 false, s.hasSSL ? 'موجود' : 'مفقود', 'الأمان الأساسي للموقع');
  add('cdn',        'CDN',                  s.hasCDN,                 false, s.hasCDN ? 'موجود' : 'غير موجود', 'تسريع التحميل عبر شبكة توزيع');
  add('robots',     'robots.txt',           seoFiles.hasRobots,       false, seoFiles.hasRobots ? 'موجود' : 'مفقود', 'توجيه محركات البحث');
  add('sitemap',    'sitemap.xml',          seoFiles.hasSitemap,      false, seoFiles.hasSitemap ? 'موجود' : 'مفقود', 'فهرس صفحات الموقع');
  add('schema',     'Structured Data',      s.hasStructuredData,      false, s.hasStructuredData ? 'موجود' : 'مفقود', 'بيانات منظمة لـ Google');
  add('og',         'Open Graph Tags',      s.hasOGImage,             false, s.hasOGImage ? 'موجود' : 'مفقود', 'مشاركة جذابة على السوشيال');
  add('robots_meta','Meta Robots',          s.hasRobotsMeta,          false, s.hasRobotsMeta ? 'موجود' : 'مفقود', 'تحكم في فهرسة الصفحات');
  add('lazy',       'Lazy Loading',         s.lazyLoadedImgs > 0,     false,
    s.totalImgs > 0 ? `${s.lazyLoadedImgs}/${s.totalImgs} صورة` : '—',
    'تحميل الصور عند الحاجة فقط');
  add('h1',         'H1 Tag',               s.h1s.length > 0,         false, s.h1s.length > 0 ? 'موجود' : 'مفقود', 'ضروري لـ SEO');
  add('meta_desc',  'Meta Description',     !!s.metaDesc,             false, s.metaDesc ? 'موجود' : 'مفقود', 'ظاهر في نتائج البحث');
  add('search',     'بحث داخلي',            s.hasSearch,              false, s.hasSearch ? 'موجود' : 'مفقود', 'يساعد العميل في إيجاد المنتجات');
  add('cart',       'سلة التسوق',           s.hasCart,                false, s.hasCart ? 'موجود' : 'مفقود', 'أساسي لعملية الشراء');
  add('mobile_menu','قائمة الجوال',         s.hasMobileMenu,          false, s.hasMobileMenu ? 'موجود' : 'مفقود', 'تجربة الجوال');
  add('wishlist',   'قائمة المفضلة',        s.hasWishlist,            false, s.hasWishlist ? 'موجود' : 'مفقود', 'يرفع معدل العودة');
  add('alt_imgs',   'صور بدون Alt',
    s.totalImgs > 0 && s.imgsMissingAlt / s.totalImgs < 0.2,
    s.totalImgs > 0 && s.imgsMissingAlt / s.totalImgs < 0.5,
    s.totalImgs > 0 ? `${s.imgsMissingAlt} من ${s.totalImgs}` : '—',
    'SEO + إتاحة الوصول');
  add('scripts',    'عدد السكريبتات',
    s.scriptsCount <= 15,
    s.scriptsCount <= 25,
    s.scriptsCount > 0 ? `${s.scriptsCount} سكريبت` : '—',
    'التأثير على سرعة التحميل');
  if (pageSpeed.success) {
    add('perf',   'Performance Score', pageSpeed.performanceScore >= 70, pageSpeed.performanceScore >= 50, `${pageSpeed.performanceScore}/100`, 'Lighthouse mobile');
    add('ps_seo', 'SEO Score (PSI)',   pageSpeed.seoScore >= 80,         pageSpeed.seoScore >= 60,         `${pageSpeed.seoScore}/100`,         'Lighthouse SEO');
    add('a11y',   'Accessibility',     pageSpeed.accessibilityScore >= 70, pageSpeed.accessibilityScore >= 50, `${pageSpeed.accessibilityScore}/100`, 'Lighthouse Accessibility');
  }
  add('tracking_ga',  'Google Analytics',   s.technologies.includes('Google Analytics'),   false, s.technologies.includes('Google Analytics')   ? 'موجود' : 'مفقود', 'قياس الزوار');
  add('tracking_gtm', 'Google Tag Manager', s.technologies.includes('Google Tag Manager'),  false, s.technologies.includes('Google Tag Manager')  ? 'موجود' : 'مفقود', 'إدارة التتبع');
  add('tracking_fb',  'Facebook Pixel',     s.technologies.includes('Facebook Pixel'),      false, s.technologies.includes('Facebook Pixel')      ? 'موجود' : 'مفقود', 'إعلانات فيسبوك وإنستقرام');
  add('tracking_tt',  'TikTok Pixel',       s.technologies.includes('TikTok Pixel'),        false, s.technologies.includes('TikTok Pixel')        ? 'موجود' : 'مفقود', 'إعلانات تيك توك');
  add('tracking_snap','Snapchat Pixel',     s.technologies.includes('Snapchat Pixel'),      false, s.technologies.includes('Snapchat Pixel')      ? 'موجود' : 'مفقود', 'إعلانات سناب شات');
  add('hotjar',       'Heatmap Tool',       s.technologies.includes('Hotjar'),              false, s.technologies.includes('Hotjar')              ? 'موجود' : 'مفقود', 'تحليل سلوك الزوار');
  return checks;
}

// ─── Behavioral Intelligence (Layer 6) ───────────────────────────────────────
async function simulateBehavior(url) {
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], ...require('../proxy').playwrightProxy() });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const loadTime = Date.now() - t0;
    let scrollDepth = 0;
    try {
      scrollDepth = await page.evaluate(() => new Promise(resolve => {
        let scrolled = 0;
        const total = document.body.scrollHeight || 1;
        const iv = setInterval(() => {
          window.scrollBy(0, 400);
          scrolled += 400;
          if (scrolled >= total * 0.7 || scrolled > 5000) { clearInterval(iv); resolve(Math.min(100, Math.round((scrolled / total) * 100))); }
        }, 150);
        setTimeout(() => { clearInterval(iv); resolve(Math.min(100, Math.round((scrolled / total) * 100))); }, 4000);
      }));
    } catch {}
    let productClickable = false;
    try {
      const link = await page.$('a[href*="/product"], a[href*="/p/"], [class*="product"] a, [class*="item"] a');
      if (link) { await link.click({ timeout: 3000 }); productClickable = true; }
    } catch {}
    let cartFriction = 'unknown';
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const btn = await page.$('[class*="add-to-cart"],[class*="addtocart"],[data-action*="cart"],[type="submit"]');
      cartFriction = btn ? 'low' : 'high';
    } catch { cartFriction = 'medium'; }
    await browser.close();
    return { success: true, loadTime, scrollDepth, productClickable, cartFriction };
  } catch (err) {
    logger.warn(`simulateBehavior: ${err.message?.slice(0, 60)}`);
    return { success: false, loadTime: null, scrollDepth: null, productClickable: null, cartFriction: null };
  }
}

// ─── Security Headers (Layer 1) ──────────────────────────────────────────────
async function checkSecurityHeaders(url) {
  try {
    const { headers } = await axios.head(url, { timeout: 10000, maxRedirects: 5, validateStatus: () => true });
    const h = k => !!headers[k.toLowerCase()];
    const csp = h('Content-Security-Policy');
    const hsts = h('Strict-Transport-Security');
    const xfo = h('X-Frame-Options');
    const xss = h('X-XSS-Protection');
    const ref = h('Referrer-Policy');
    const perm = h('Permissions-Policy');
    const nosniff = h('X-Content-Type-Options');
    const score = (csp ? 20 : 0) + (hsts ? 20 : 0) + (xfo ? 15 : 0) + (xss ? 10 : 0) + (ref ? 15 : 0) + (perm ? 10 : 0) + (nosniff ? 10 : 0);
    return { success: true, score, headers: { csp, hsts, xfo, xss, ref, perm, nosniff } };
  } catch (err) {
    logger.warn(`checkSecurityHeaders: ${err.message?.slice(0, 60)}`);
    return { success: false, score: 0, headers: {} };
  }
}

// ─── Trust Score (Layer 8) ────────────────────────────────────────────────────
function computeTrustScore(scraped, seoFiles) {
  let score = 0;
  // Core trust
  if (scraped.hasSSL)                                      score += 10;
  if (scraped.hasReviewSection)                            score += 8;
  if (scraped.hasReturnPolicy)                             score += 7;
  if (scraped.hasWhatsAppFloat)                            score += 6;
  if (scraped.hasPaymentBadgesInFooter)                    score += 5;
  if (scraped.hasTrustBadges)                             score += 4;
  if (scraped.phoneNumbers?.length)                        score += 4;
  if (scraped.contactEmail)                                score += 4;
  if (Object.keys(scraped.socialLinks || {}).length >= 2)  score += 4;
  if (scraped.hasChatWidget)                              score += 3;
  if (seoFiles?.hasSitemap)                               score += 2;
  if (scraped.hasNewsletterForm)                           score += 1;
  // Saudi legal & business verification (high value)
  if (scraped.hasTaxNumber)                               score += 10;
  if (scraped.hasBusinessVerification)                     score += 8;
  if (scraped.hasVATBadge)                                score += 4;
  if (scraped.hasCommercialReg)                           score += 5;
  if (scraped.hasZATCA)                                   score += 3;
  return Math.min(100, score);
}

// ─── Priority Score (Layer 13) ───────────────────────────────────────────────
function computePriorityScore(impact, confidence, ease) {
  return Math.round((impact * confidence * ease) / 10);
}

// ─── AI Providers: Claude (primary) + Gemini Vision + Groq (fallback) ────────
const logger = require('../logger');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const { takeStoreScreenshots } = require('../utils/screenshot');

const claudeAI = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;
const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const groqAI   = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// نموذج النصوص/التحليل/الشات — قابل للتغيير من .env (الافتراضي: Gemini 2.5 Pro)
const GEMINI_TEXT_MODEL  = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// نموذج توليد الصور (Pro لا يولّد صوراً — يبقى منفصلاً)
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

// إصلاح JSON المقتطع/الناقص: يغلق السلاسل والأقواس المفتوحة (للردود التي قُطِعت)
function repairJson(s) {
  var start = s.indexOf('{');
  if (start > 0) s = s.slice(start);
  var inStr = false, esc = false, stack = [], out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s[i]; out += c;
    if (esc) { esc = false; continue; }
    if (c === '\\') { if (inStr) esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') stack.pop();
  }
  if (inStr) out += '"';                          // أغلق سلسلة مفتوحة
  out = out.replace(/,\s*$/, '');                 // فاصلة زائدة في النهاية
  for (var j = stack.length - 1; j >= 0; j--) out += (stack[j] === '{' ? '}' : ']'); // أغلق الأقواس
  out = out.replace(/,\s*([}\]])/g, '$1');
  return out;
}

const parseJSON = (raw) => {
  const match = raw.match(/```json\s*([\s\S]+?)\s*```/) || raw.match(/\{[\s\S]+\}/);
  let txt = match ? (match[1] || match[0]) : raw;
  try { return JSON.parse(txt); } catch (e) {}
  try { return JSON.parse(txt.replace(/,\s*([}\]])/g, '$1')); } catch (e) {}
  // أخيراً: أصلح الاقتطاع (سلاسل/أقواس مفتوحة)
  return JSON.parse(repairJson(txt));
};

// Groq — last-resort fallback
const groqFallback = async (prompt, maxTokens = 4000) => {
  if (!groqAI) throw new Error('Groq not configured');
  const res = await groqAI.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt + '\n\nأجب بـ JSON صارم فقط.' }],
    response_format: { type: 'json_object' },
    temperature: 0.55,
    max_tokens: Math.min(maxTokens, 6000),
  });
  return JSON.parse(res.choices[0].message.content);
};

// Gemini text — fallback when Claude is unavailable
// هل الخطأ مؤقّت (شبكة/اتصال/خادم) ويستحق إعادة المحاولة؟
const isTransientErr = (e) => {
  const m = (e && (e.message || '')) + '';
  return e?.status === 503 || e?.status === 500 ||
    /error fetching|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network|socket hang up|timeout|terminated|503|500|UNAVAILABLE/i.test(m);
};

const aiGenerateGemini = async (prompt, maxTokens = 4000, opts = {}) => {
  const _attempt = opts._attempt || 0;
  const temperature = opts.temperature != null ? opts.temperature : 0.5;
  try {
    const model = geminiAI.getGenerativeModel({
      model: GEMINI_TEXT_MODEL,
      generationConfig: { maxOutputTokens: 8192, temperature, responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt + '\n\nأجب بـ JSON صارم فقط بدون أي نص خارج الـ JSON.');
    return parseJSON(result.response.text());
  } catch (e) {
    const is429 = e.status === 429 || e.message?.includes('429') || e.message?.includes('quota');
    // إعادة المحاولة على الحصة (429) أو أخطاء الشبكة/الخادم المؤقتة — حتى 3 محاولات بتأخّر تصاعدي
    if ((is429 || isTransientErr(e)) && _attempt < 3) {
      const wait = is429 ? 3000 : 1200 * (_attempt + 1);
      logger.warn(`Gemini ${is429 ? 'quota' : 'network'} error — retry ${_attempt + 1}/3 بعد ${wait}ms: ${e.message?.slice(0, 70)}`);
      await new Promise(r => setTimeout(r, wait));
      return aiGenerateGemini(prompt, maxTokens, { ...opts, _attempt: _attempt + 1 });
    }
    // استنفدت المحاولات → Groq كحل أخير بدل ترك التقرير فارغاً
    logger.warn(`Gemini failed نهائياً — تحويل إلى Groq: ${e.message?.slice(0, 70)}`);
    try { return await groqFallback(prompt, maxTokens); }
    catch (g) { logger.warn(`Groq fallback فشل أيضاً: ${g.message?.slice(0, 70)}`); throw e; }
  }
};

// المزوّد الأساسي للنصوص/JSON = Gemini (مدفوع) → Groq احتياطي
// (Claude مُعطّل من المسار — لتفعيله لاحقاً غيّر الـ alias)
const aiGenerate = aiGenerateGemini;
const aiGenerateClaude = aiGenerate; // alias للحفاظ على نقاط النداء القائمة

// Gemini Vision — تحليل لقطات الشاشة (الأساسي للصور)
const aiAnalyzeWithVision = async (prompt, imageParts, _attempt = 0) => {
  try {
    const model = geminiAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL, generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 } });
    const result = await model.generateContent([{ text: prompt }, ...imageParts.slice(0, 4)]);
    return parseJSON(result.response.text());
  } catch (e) {
    if (isTransientErr(e) && _attempt < 2) {
      await new Promise(r => setTimeout(r, 1200 * (_attempt + 1)));
      return aiAnalyzeWithVision(prompt, imageParts, _attempt + 1);
    }
    logger.warn(`Gemini Vision failed — fallback to text-only Gemini: ${e.message?.slice(0, 80)}`);
    return aiGenerate(prompt, 6000); // تحليل نصي بدون الصورة كحل أخير
  }
};

// المساعد الذكي (محادثة) — Gemini أساسي → Groq احتياطي
const aiChat = async (systemPrompt, history, message) => {
  try {
    const model = geminiAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'حسناً، أنا جاهز للمساعدة.' }] },
        ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
      ],
    });
    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (e) {
    if (groqAI) {
      const res = await groqAI.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, ...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: message }],
        max_tokens: 600,
      });
      return res.choices[0].message.content;
    }
    throw e;
  }
};

/**
 * يدع الذكاء الاصطناعي يختار أنسب الخدمات من قائمة مرشّحين حقيقيين (RAG — لا هلوسة).
 * المحرك يضيّق القائمة أولاً، والـAI يختار ويكتب سبباً مخصّصاً يربط الخدمة بمشكلة المتجر.
 * @param {Array}  candidates مرشّحون من الكتالوج (id,name,category,price,currency,url,reasons)
 * @param {string} contextText  ملخّص مشاكل المتجر
 * @param {number} want  العدد المطلوب
 * @returns {Promise<Array>} نفس عناصر candidates المختارة + حقل why
 */
async function aiPickServices(candidates, contextText, want = 4) {
  if (!Array.isArray(candidates) || !candidates.length) return [];
  const list = candidates.map((s, i) =>
    `${i}) ${s.name} — الفئة: ${s.category || 'عام'}${s.price > 0 ? ` — ${s.price} ${s.currency || 'SAR'}` : ' — مجاناً'}`
  ).join('\n');
  const prompt =
`أنت مستشار متاجر إلكترونية خبير في "خبراء المنصات". إليك ملخّص فحص متجر:
${contextText}

مهمتك: حلّل التقرير أعلاه واختر **خدمة واحدة أو خدمتين كحد أقصى** من قائمتنا الحقيقية — بشرط أن تكون **مناسبة 100% لنشاط هذا المتجر ولأهم نقطة ضعف فعلية لديه**.
قواعد صارمة جداً:
- الدقة أهم من العدد: رشّح فقط ما أنت متأكد 100% أنه يعالج مشكلة حقيقية ظهرت في التقرير ويخص نشاط المتجر. خدمة واحدة ممتازة أفضل من خدمتين إحداهما غير دقيقة.
- لا ترشّح خدمة لا تخص نشاط المتجر (مثال: لا ترشّح "تسجيل في تطبيقات توصيل الطعام" لمتجر ملابس).
- لا تخترع خدمات — اختر بالأرقام فقط ومن القائمة حصراً:
${list}

أعِد JSON فقط:
{"picks":[{"i":<رقم الخدمة>,"why":"جملة عربية مختصرة تربط الخدمة بأهم نقطة ضعف فعلية ونشاط المتجر"}]}
الأهم أولاً، بحد أقصى ${want}. إن لم تكن متأكداً من خدمة فلا ترشّحها (يُقبل ترشيح واحدة فقط).`;
  const out = await aiGenerate(prompt, 1500);
  const picks = Array.isArray(out?.picks) ? out.picks : [];
  const seen = new Set();
  const result = [];
  for (const p of picks) {
    const i = Number(p?.i);
    if (!Number.isInteger(i) || i < 0 || i >= candidates.length || seen.has(i)) continue;
    seen.add(i);
    result.push({ ...candidates[i], why: String(p?.why || '').trim().slice(0, 220) });
    if (result.length >= want) break;
  }
  return result;
}

const _aiStack = [
  `Gemini ${GEMINI_TEXT_MODEL} (primary: نصوص + vision + شات) + ${GEMINI_IMAGE_MODEL} (صور)`,
  groqAI ? 'Groq (fallback)' : null,
  claudeAI ? 'Claude (متاح لكنه معطّل من المسار)' : null,
].filter(Boolean).join(' + ');
logger.info(`AI: ${_aiStack} ✓`);

// ─── Permission Check ─────────────────────────────────────────────────────────
async function checkToolPermission(userId, toolName, userToolsAccess) {
  try {
    const { rows } = await db.query('SELECT * FROM tool_settings WHERE tool_name=$1', [toolName]);
    const s = rows[0];
    if (!s) return { allowed: true };

    // صلاحية المستخدم الصريحة: true = سماح دائم، false = منع دائم، undefined = حسب الإعداد العام
    const explicit = userToolsAccess ? userToolsAccess[toolName] : undefined;
    const dn = s.display_name;

    // 1) منع صريح لهذا المستخدم
    if (explicit === false)
      return { allowed: false, code: 'TOOL_DENIED', toolName, displayName: dn,
        message: 'هذه الأداة غير متاحة لحسابك. تواصل مع الفريق إذا كنت تحتاجها.' };

    // 2) بوابة الحالة — مفتاح إيقاف عام يقفل الأداة للجميع (مهما كانت صلاحياتهم)
    if (s.status === 'hidden')
      return { allowed: false, code: 'TOOL_HIDDEN', toolName, displayName: dn,
        message: 'هذه الأداة غير متاحة حالياً.' };
    if (s.status === 'coming_soon')
      return { allowed: false, code: 'TOOL_COMING', toolName, displayName: dn,
        message: 'هذه الأداة قادمة قريباً، ترقّبها!' };

    // 2.5) بوابة الاشتراك/التجربة المجانية — تُقفل بعد انتهاء التجربة (إلا المشترك/الأدمن)
    try {
      const { subscriptionState } = require('../subscription');
      const ur = (await db.query('SELECT is_admin, created_at, subscription_until, plan_name FROM users WHERE id=$1', [userId])).rows[0];
      const sub = await subscriptionState(ur, { trialDays: (s.trial_days != null ? s.trial_days : undefined) });
      if (sub.locked && explicit !== true)
        return { allowed: false, code: 'TRIAL_ENDED', toolName, displayName: dn, trialEndsAt: sub.trialEndsAt,
          message: 'انتهت فترتك المجانية. رقّ باقتك لمواصلة استخدام الأدوات.' };
    } catch { /* لا تمنع عند خطأ غير متوقع */ }

    // 3) مدفوعة (تحتاج إذن صريح)
    if (s.is_paid && explicit !== true)
      return { allowed: false, code: 'TOOL_PAID', toolName, displayName: dn,
        message: 'هذه الأداة مدفوعة. يمكنك طلب الوصول وسيتواصل معك الفريق.' };

    // 4) الحد اليومي المجاني
    if (s.daily_free_limit !== null && explicit !== true) {
      const { rows: u } = await db.query(
        `SELECT COUNT(*) FROM tool_logs WHERE user_id=$1 AND tool_name=$2 AND created_at::date=CURRENT_DATE`,
        [userId, toolName]
      );
      const used = parseInt(u[0].count);
      if (used >= s.daily_free_limit)
        return { allowed: false, code: 'DAILY_LIMIT', used, limit: s.daily_free_limit, toolName, displayName: dn,
          message: `وصلت للحد اليومي (${used}/${s.daily_free_limit}). جرّب غداً أو تواصل معنا للوصول غير المحدود.` };
      return { allowed: true, used, limit: s.daily_free_limit, remaining: s.daily_free_limit - used };
    }
    return { allowed: true, used: null, limit: null };
  } catch {
    return { allowed: true };
  }
}

// ─── Async error wrapper (Express 4 compat) ───────────────────────────────────
const ar = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── Public: Tool Settings ────────────────────────────────────────────────────
router.get('/settings', ar(async (req, res) => {
  const { rows } = await db.query('SELECT tool_name, display_name, is_paid, daily_free_limit, status, sort_order, price, badge, features FROM tool_settings ORDER BY sort_order ASC, tool_name');
  res.json(rows);
}));

// باقات الاشتراك المفعّلة (عرض عام)
router.get('/plans', ar(async (req, res) => {
  const { rows } = await db.query('SELECT id,name,price,price_yearly,period,badge,features,tools FROM plans WHERE active=true ORDER BY sort_order ASC, id ASC');
  res.json(rows);
}));

// حالة اشتراك المستخدم الحالي + الباقات (للبانر ونافذة الترقية)
router.get('/subscription', auth, ar(async (req, res) => {
  const { subscriptionState } = require('../subscription');
  const st = await subscriptionState(req.user);
  const plans = (await db.query('SELECT id,name,price,price_yearly,period,badge,features,tools FROM plans WHERE active=true ORDER BY sort_order ASC, id ASC')).rows;
  res.json({ ...st, plans });
}));

// ─── 15-Layer AI Call Functions ───────────────────────────────────────────────

async function aiCallCore(scraped, seoFiles, pageSpeed, security, category, benchmark, storeUrl, platform, storeName) {
  const si = scraped.success;
  const ps = pageSpeed.success;
  const data = si ? `المنصة: ${platform}${scraped.themeName ? ` (ثيم: ${scraped.themeName})` : ''}
SSL: ${scraped.hasSSL ? '✓' : '✗'} | CDN: ${scraped.hasCDN ? '✓' : '✗'} | سكريبتات: ${scraped.scriptsCount}
H1 (${scraped.h1s.length}): ${scraped.h1s.slice(0, 2).join(' | ') || 'مفقود'} | الصور: ${scraped.totalImgs} (بدون Alt: ${scraped.imgsMissingAlt})
Structured Data: ${scraped.hasStructuredData ? '✓' : '✗'} | OG Image: ${scraped.hasOGImage ? '✓' : '✗'} | Robots Meta: ${scraped.hasRobotsMeta ? '✓' : '✗'}
robots.txt: ${seoFiles.hasRobots ? '✓' : '✗'} | sitemap.xml: ${seoFiles.hasSitemap ? '✓' : '✗'}
بحث: ${scraped.hasSearch ? '✓' : '✗'} | سلة: ${scraped.hasCart ? '✓' : '✗'} | مفضلة: ${scraped.hasWishlist ? '✓' : '✗'} | قائمة جوال: ${scraped.hasMobileMenu ? '✓' : '✗'}
طرق الدفع (${scraped.paymentMethods.length}): ${scraped.paymentMethods.join(', ') || 'لم يُكتشف'}
تقنيات: ${scraped.technologies.slice(0, 8).join(', ') || 'لم يُكتشف'}
إيميل: ${scraped.contactEmail || 'لا'} | هاتف: ${scraped.phoneNumbers?.join(', ') || 'لا'}
سوشيال: ${Object.keys(scraped.socialLinks).join(', ') || 'لا'}
أمان Headers: ${security.success ? `${security.score}/100 — CSP:${security.headers.csp ? '✓' : '✗'} HSTS:${security.headers.hsts ? '✓' : '✗'} XFO:${security.headers.xfo ? '✓' : '✗'}` : 'غير متاح'}
${ps ? `Performance: ${pageSpeed.performanceScore}/100 | SEO: ${pageSpeed.seoScore}/100 | Accessibility: ${pageSpeed.accessibilityScore}/100
LCP: ${pageSpeed.lcp || 'N/A'} | CLS: ${pageSpeed.cls || 'N/A'} | TTFB: ${pageSpeed.ttfb || 'N/A'} | FCP: ${pageSpeed.fcp || 'N/A'}` : ''}` : 'تعذّر الوصول للمتجر.';

  const paymentSaudi = si ? (() => {
    const have = scraped.paymentMethods || [];
    const all = ['مدى','Apple Pay','STC Pay','تابي','تمارا','فيزا','ماستركارد','الدفع عند الاستلام'];
    const missing = all.filter(p => !have.includes(p));
    return `متوفر (${have.length}): ${have.join('، ') || 'لا شيء'} | مفقود: ${missing.join('، ')}`;
  })() : 'غير معروف';

  const themeLine = si && scraped.themeName
    ? `الثيم: ${scraped.themeName}${scraped.themeCode ? ` (${scraped.themeCode})` : ''}`
    : si && scraped.themeCode ? `كود الثيم: ${scraped.themeCode}` : 'الثيم: غير محدد';

  const prompt = `أنت محلل تجارة إلكترونية سعودي خبير ومتخصص في منصتَي سلة وزد.
الرابط: ${storeUrl} | التخصص: ${category || 'عام'}
${data}
${themeLine}
طرق الدفع — ${paymentSaudi}

قواعد التحليل الذكي:
1. كل معيار يجب أن يذكر البيانات الفعلية المُكتشفة (الأرقام، الأسماء، الحالة الحقيقية)
2. إذا كانت المنصة سلة أو زد، اذكر ميزات وقيود المنصة في التحليل
3. إذا كانت طرق دفع مهمة مفقودة (تابي/تمارا/Apple Pay)، اذكرها صراحةً مع الأثر المتوقع
4. الـ feedback لكل معيار يجب أن يكون خاصاً بهذا المتجر تحديداً، لا عاماً
5. لا تكتب "يُنصح بـ..." بشكل عام — اكتب "هذا المتجر تحديداً يفتقر إلى X مما يُفقده Y"

تنبيه مهم: جميع الـ score في الـ JSON يجب أن تكون من 0 إلى 100 (وليس من 0 إلى 10).
معادلة overallScore (15-100): ابدأ بـ 50.
+5 SSL | +5 CDN | +5 Structured Data | +5 robots.txt | +3 sitemap | +5 Robots Meta | +5 بحث | +4 سلة | +3 مفضلة | +3 قائمة جوال | +2 OG Image
+1 لكل دفع محلي (مدى/STC Pay/Apple Pay/تابي/تمارا) — حد أقصى +8
${ps ? `+5 إذا Performance ≥ 70 | +3 إذا Performance ≥ 50` : ''}
-10 صور بدون Alt > 40% | -5 سكريبتات > 25 | -5 لا H1 | -8 لا SSL | -5 لا سلة | -3 لا تواصل

أجب بـ JSON صارم فقط — ابدأ بـ { مباشرة. جميع الأسماء والتسميات يجب أن تكون بالعربية فقط:
{"overallScore":0,"storeName":"","platform":"","summary":"<4 جمل خاصة بهذا المتجر تحديداً: ما اكتشفناه فعلاً + أكبر مشكلة بالأرقام + أكبر فرصة محددة + التوقع المالي>",
"seo":{"score":0,"items":[{"check":"<الاسم بالعربية>","status":"pass|warn|fail","value":"<القيمة الفعلية>","issue":"<المشكلة>","fix":"<الحل>"}]},
"ux":{"score":0,"items":[{"name":"<الاسم بالعربية>","score":0,"issue":"<المشكلة>","fix":"<الحل>"}]},
"criteria":[{"name":"<الاسم بالعربية>","score":0,"feedback":"<2-3 جمل خاصة بهذا المتجر — بيانات حقيقية + تأثير + إجراء محدد>","actions":["<إجراء محدد قابل للتنفيذ غداً>","<إجراء ثانٍ>"]}]}
seo.items أمثلة على الأسماء العربية: "العنوان الرئيسي H1"، "وصف الصفحة"، "البيانات الهيكلية"، "خريطة الموقع"، "صورة المشاركة"، "ضبط الفهرسة".
ux.items أمثلة: "وضوح زر الشراء"، "التدرج البصري"، "تناسق الهوية"، "جودة صور المنتجات"، "القسم الرئيسي".
criteria يضم بالضبط 15 معيار: SEO والمحتوى، هوية البراند والثيم، وضوح التخصص والجمهور، صفحات المنتجات، تجربة الشراء والـ CRO، التوافق مع الجوال، سرعة التحميل، ملاءمة السوق السعودي الخليجي، وسائل الدفع السعودية، الشحن والتوصيل، دعم العملاء والتواصل، الثقة والمصداقية، التسويق عبر السوشيال، استراتيجية التسعير، برامج الولاء والاحتفاظ.`;
  return aiGenerateClaude(prompt, 8000);
}

async function aiCallVisual(screenshots, scraped, storeUrl) {
  const imageParts = screenshots.success
    ? screenshots.pages.flatMap(pg => [
        pg.desktop ? { inlineData: { mimeType: 'image/jpeg', data: pg.desktop } } : null,
        pg.mobile  ? { inlineData: { mimeType: 'image/jpeg', data: pg.mobile  } } : null,
      ]).filter(Boolean)
    : [];
  const si = scraped.success;
  const base = si ? `منصة: ${scraped.platform} | SSL: ${scraped.hasSSL ? '✓' : '✗'} | تقييمات: ${scraped.hasReviewSection ? '✓' : '✗'} | شارات ثقة: ${scraped.hasTrustBadges ? '✓' : '✗'} | جاليري: ${scraped.hasProductGallery ? '✓' : '✗'} | Zoom: ${scraped.hasProductZoom ? '✓' : '✗'}` : '';
  const prompt = `${imageParts.length ? `[تحليل بصري — ${imageParts.length} صورة]` : '[تحليل نصي]'}
حلّل التصميم البصري للمتجر: ${storeUrl}
${base}
أجب بـ JSON صارم فقط — ابدأ بـ { مباشرة. جميع الأسماء بالعربية فقط.
IMPORTANT: visualScore وكل score داخل items يجب أن يكون من 0 إلى 100 (وليس من 0 إلى 10).
{"visualScore":0,
"heroSection":{"score":0,"attentionGrabbing":"pass|warn|fail","messageClear":"pass|warn|fail","ctaVisible":"pass|warn|fail","improvement":"<تحسين محدد بالعربية>"},
"productImages":{"score":0,"quality":"professional|amateur|mixed","bgConsistency":"pass|warn|fail","lighting":"good|poor","hasMultipleAngles":false,"issues":[]},
"brandConsistency":{"score":0,"colorHarmony":"pass|warn|fail","fontConsistency":"pass|warn|fail","overallCoherence":"pass|warn|fail"},
"visualAttention":{"firstFocus":"<أين ينظر العميل أولاً>","secondFocus":"<ثانياً>","distractors":[""]},
"premiumFeel":"premium|professional|mid|budget",
"items":[{"name":"<الاسم بالعربية>","score":0,"status":"pass|warn|fail","issue":"<المشكلة بالعربية>","fix":"<الحل بالعربية>"}]}
items: 13 معيار — وضوح CTA الرئيسي، التدرج البصري، تناسق الهوية والألوان، جودة صور المنتجات، Hero Section، التنظيم البصري، الخطوط وسهولة القراءة، إشارات الثقة المرئية، Social Proof، تجربة الجوال، عدم الازدحام البصري، مستوى الاحترافية Premium، اتساق التصميم.`;
  let result, visionUsed = false;
  if (imageParts.length) {
    result = await aiAnalyzeWithVision(prompt, imageParts);
    if (result._visionSource) { delete result._visionSource; }
    else visionUsed = true;
  } else {
    result = await aiGenerateClaude(prompt, 6000);
  }
  return { ...result, visionUsed };
}

async function aiCallConversion(scraped, behavioral, category, storeUrl) {
  const si = scraped.success;
  const beh = behavioral.success;
  const data = si ? `مراجعات: ${scraped.hasReviewSection ? '✓' : '✗'} | عداد: ${scraped.hasCountdown ? '✓' : '✗'} | Urgency: ${scraped.hasUrgencyText ? '✓' : '✗'}
زر شراء: ${scraped.hasAddToCartBtn ? '✓' : '✗'} | WhatsApp: ${scraped.hasWhatsAppFloat ? '✓' : '✗'} | Chat: ${scraped.hasChatWidget ? '✓' : '✗'}
شحن مجاني: ${scraped.hasShippingBadge ? '✓' : '✗'} | سياسة إرجاع: ${scraped.hasReturnPolicy ? '✓' : '✗'} | ثقة: ${scraped.hasTrustBadges ? '✓' : '✗'}
دفع فوتر: ${scraped.hasPaymentBadgesInFooter ? '✓' : '✗'} | فيديو: ${scraped.hasProductVideo ? '✓' : '✗'} | مقاسات: ${scraped.hasSizeGuide ? '✓' : '✗'}
Apple Pay: ${scraped.paymentMethods.includes('Apple Pay') ? '✓' : '✗'} | مدى: ${scraped.paymentMethods.includes('مدى') ? '✓' : '✗'} | تابي: ${scraped.paymentMethods.includes('تابي') ? '✓' : '✗'} | تمارا: ${scraped.paymentMethods.includes('تمارا') ? '✓' : '✗'} | COD: ${scraped.paymentMethods.includes('الدفع عند الاستلام') ? '✓' : '✗'}` : 'تعذّر الوصول.';
  const behData = beh ? `\nسلوك: وقت تحميل: ${behavioral.loadTime}ms | Scroll: ${behavioral.scrollDepth}% | منتج قابل للنقر: ${behavioral.productClickable ? '✓' : '✗'} | احتكاك السلة: ${behavioral.cartFriction}` : '';
  const v4data = si ? `\nخصومات مشطوبة: ${scraped.hasCrossedPrice ? '✓' : '✗'} | خطر وهمية: ${scraped.hasFakeDiscountRisk ? '⚠️' : '✗'} | شارات منتج: ${scraped.hasProductBadges ? '✓' : '✗'}
شحن واضح: ${scraped.hasShippingInfo ? '✓' : '✗'} | إرجاع بأيام: ${scraped.hasReturnDays ? '✓' : '✗'} | برنامج ولاء: ${scraped.hasLoyaltyProgram ? '✓' : '✗'}` : '';
  // Identify the most impactful missing CRO elements for this store specifically
  const missingCRO = si ? [
    !scraped.hasReviewSection    && 'تقييمات العملاء مفقودة',
    !scraped.hasAddToCartBtn     && 'زر الشراء غير واضح',
    !scraped.hasWhatsAppFloat    && 'واتساب عائم مفقود',
    !scraped.hasReturnPolicy     && 'سياسة الإرجاع مفقودة',
    !scraped.hasShippingBadge    && 'شارة الشحن المجاني مفقودة',
    !scraped.hasTrustBadges      && 'شارات الثقة مفقودة',
    !scraped.hasPaymentBadgesInFooter && 'أيقونات الدفع في الفوتر مفقودة',
    !scraped.paymentMethods.includes('تابي') && 'تابي مفقود (زيادة التحويل 15-25%)',
    !scraped.paymentMethods.includes('تمارا') && 'تمارا مفقودة (زيادة AOV 30-40%)',
  ].filter(Boolean) : [];

  const prompt = `خبير CRO وتجارة إلكترونية سعودية. حلّل متجر: ${storeUrl} (تخصص: ${category || 'عام'})
${data}${behData}${v4data}
${missingCRO.length ? `مشاكل CRO محددة مُكتشفة: ${missingCRO.join(' | ')}` : ''}

قواعد إلزامية:
- quickWins: 4 إجراءات محددة جداً يمكن تنفيذها خلال 24 ساعة لهذا المتجر تحديداً (لا توصيات عامة)
- strengths: ما وجدناه فعلاً ✓ في هذا المتجر
- weaknesses: ما وجدناه ✗ مع تأثيره الفعلي على المبيعات بالأرقام

أجب بـ JSON صارم فقط — ابدأ بـ { مباشرة:
{"croScore":0,"conversionProbability":0,
"checkoutFriction":{"score":0,"estimatedSteps":0,"issues":["<مشكلة حقيقية>"],"improvements":["<حل محدد>"]},
"offerStrength":{"score":0,"urgencyScore":0,"scarcityScore":0,"socialProofScore":0,"issues":[""]},
"commerce":{"score":0,"items":[{"name":"","status":"pass|fail","detail":"<ما وُجد فعلاً>","fix":"<كيف تصلحه في سلة أو زد>"}]},
"cro":{"items":[{"name":"","score":0,"impact":"±X% معدل تحويل","revenueImpact":0,"detail":"<خاص بهذا المتجر>"}]},
"trust":{"score":0,"items":[{"name":"","status":"pass|fail","detail":"<ما وُجد أو ما يفقده>"}]},
"behavioral":{"insights":["",""]},
"quickWins":["<إجراء محدد — ليس عاماً>","","",""],"strengths":["<ما وُجد فعلاً>","",""],"weaknesses":["<مشكلة + أثرها بالأرقام>","",""]}
conversionProbability: 0-100 بناءً على ما وُجد فعلاً.
commerce: 8 معايير Gulf — Apple Pay, مدى, COD, WhatsApp, تابي/تمارا, RTL, العربية, الشحن المحلي.
cro: 10 معايير — revenueImpact رقم SAR تقديري.`;
  return aiGenerateClaude(prompt, 6000);
}

async function aiCallBusiness(scraped, category, benchmark, behavioral, security, storeUrl) {
  const si = scraped.success;

  // Build precise payment gap analysis
  const paymentData = si ? (() => {
    const have = scraped.paymentMethods || [];
    const critical = ['تابي','تمارا','Apple Pay','STC Pay','مدى'];
    const missingCritical = critical.filter(p => !have.includes(p));
    const gapStr = missingCritical.length
      ? `متاح: ${have.join('، ')} | مفقود (حرج): ${missingCritical.join('، ')}`
      : `متاح: ${have.join('، ')} — تغطية ممتازة`;
    return gapStr;
  })() : 'غير معروف';

  const data = si ? `التخصص: ${category || 'عام'} | المنصة: ${scraped.platform}${scraped.themeName ? ` | الثيم: ${scraped.themeName}` : ''}
متوسط الصناعة: ${benchmark.avgScore}/100 | أفضل 10%: ${benchmark.topScore}/100
طرق الدفع — ${paymentData}
أمان: ${security.score || 0}/100 — CSP:${security.headers?.csp ? '✓' : '✗'} HSTS:${security.headers?.hsts ? '✓' : '✗'}
مراجعات: ${scraped.hasReviewSection ? '✓' : '✗'} | إرجاع: ${scraped.hasReturnPolicy ? '✓' : '✗'} | Chat: ${scraped.hasChatWidget ? '✓' : '✗'}
ولاء: ${scraped.hasLoyaltyProgram ? '✓' : '✗'} | بطاقات هدية: ${scraped.hasGiftCards ? '✓' : '✗'}
سوشيال (${Object.keys(scraped.socialLinks || {}).length}): ${Object.keys(scraped.socialLinks || {}).join(', ') || 'لا'}
شحن واضح: ${scraped.hasShippingInfo ? '✓' : '✗'} | COD: ${scraped.hasCODVisibility ? '✓' : '✗'} | أيام الإرجاع: ${scraped.hasReturnDays ? '✓' : '✗'}` : `الرابط: ${storeUrl} | التخصص: ${category || 'عام'}`;

  const prompt = `خبير تجارة إلكترونية سعودي متخصص في سلة وزد وتحليل الإيرادات.
المتجر: ${storeUrl}
${data}

قواعد إلزامية للـ actions:
- كل action يجب أن يكون محدداً لهذا المتجر (لا توصيات عامة)
- إذا كانت تابي أو تمارا مفقودة، actions[0] يجب أن يكون "تفعيل التقسيط" مع تأثير مالي واقعي
- إذا كانت سوشيال ميديا ضعيفة أو مفقودة، اذكر المنصة المناسبة لهذا التخصص تحديداً
- revenueImpact يجب أن يكون رقماً واقعياً بالريال السعودي بناءً على متوسط ${category || 'التجارة الإلكترونية السعودية'}

أجب بـ JSON صارم فقط:
{"industry":{"items":[{"name":"","score":0,"status":"pass|warn|fail","detail":"<حقيقة محددة عن هذا المتجر>","fix":"<إجراء محدد قابل للتنفيذ>"}]},
"revenue":{"currentMonthlyRevenue":0,"estimatedMonthlyLoss":0,"potentialMonthlyRevenue":0,"conversionRate":0,"aov":0,"topIssues":[{"issue":"","estimatedImpact":0,"confidence":"high|medium|low"}]},
"security":{"score":0,"findings":[{"header":"","present":false,"risk":"","fix":""}]},
"actions":[{"title":"","desc":"<لماذا هذا المتجر تحديداً يحتاج هذا>","impact":"<الأثر المتوقع بالأرقام>","priority":"high|medium|low","effort":"low|medium|high","estimatedRevenue":0,"priorityScore":0}]}
industry: 6 معايير خاصة بـ ${category || 'المتاجر العامة السعودية'}.
revenue: أرقام SAR واقعية — currentMonthlyRevenue وpotentialMonthlyRevenue تقديريان.
actions: 8 مهام — مرتّبة بـ priorityScore تنازلياً.`;
  return aiGenerateClaude(prompt, 6000);
}

async function aiCallOptimizer(scraped, category, storeUrl) {
  const si = scraped.success;
  const data = si ? `اسم المتجر: ${scraped.pageTitle} | المنصة: ${scraped.platform}
Meta الحالي: ${scraped.metaDesc?.slice(0, 100) || 'مفقود'}
H1: ${scraped.h1s[0] || 'مفقود'} | اللغة: ${scraped.lang}
التخصص: ${category || 'عام'}` : `الرابط: ${storeUrl} | التخصص: ${category || 'عام'}`;
  const prompt = `خبير SEO وكتابة محتوى عربي. اقترح محتوى محسّناً للمتجر: ${storeUrl}
${data}
أجب بـ JSON صارم فقط:
{"heroSection":{"suggestedHeadline":"","suggestedSubtext":"","suggestedCTA":""},
"metaTitle":"<أقل من 60 حرف>","metaDescription":"<150-155 حرف>",
"productDescriptionTemplate":"<قالب وصف 100-150 كلمة>",
"ctaCopy":[{"placement":"","suggested":""}],
"seoTitles":[{"page":"","suggested":""}],
"contentCalendar":[{"week":"","topic":"","platform":"","hook":""}]}
ctaCopy: 4 مواضع (الرئيسية، المنتج، السلة، الفوتر).
seoTitles: 5 صفحات رئيسية.
contentCalendar: 4 أسابيع محتوى سوشيال.`;
  return aiGenerateClaude(prompt, 4000);
}

// ─── aiCallPsychology — Buyer Psychology + Brand + Pricing + Competitors ─────
async function aiCallPsychology(scraped, screenshots, category, storeUrl) {
  const imageParts = screenshots.success
    ? screenshots.pages.flatMap(pg => [
        pg.desktop ? { inlineData: { mimeType: 'image/jpeg', data: pg.desktop } } : null,
        pg.mobile  ? { inlineData: { mimeType: 'image/jpeg', data: pg.mobile  } } : null,
      ]).filter(Boolean).slice(0, 3)
    : [];

  const si = scraped.success;
  const industry = category || (si ? scraped.detectedIndustry : null) || 'عام';
  const data = si ? `التخصص: ${industry} | المنصة: ${scraped.platform}
أسعار مشطوبة: ${scraped.hasCrossedPrice ? '✓' : '✗'} | خصومات: ${scraped.hasDiscountBadge ? '✓' : '✗'} | خطر خصومات وهمية: ${scraped.hasFakeDiscountRisk ? '⚠️' : '✗'}
جاليري: ${scraped.hasProductGallery ? '✓' : '✗'} | Zoom: ${scraped.hasProductZoom ? '✓' : '✗'} | شارات منتج: ${scraped.hasProductBadges ? '✓' : '✗'}
فلترة: ${scraped.hasSearchFilter ? '✓' : '✗'} | بحث مباشر: ${scraped.hasLiveSearch ? '✓' : '✗'}
شحن واضح: ${scraped.hasShippingInfo ? '✓' : '✗'} | إرجاع بأيام: ${scraped.hasReturnDays ? '✓' : '✗'} | COD ظاهر: ${scraped.hasCODVisibility ? '✓' : '✗'}
urgency: ${scraped.hasCountdown ? '✓' : '✗'} | نص ندرة: ${scraped.hasUrgencyText ? '✓' : '✗'}
تقييمات: ${scraped.hasReviewSection ? '✓' : '✗'} | فيديو: ${scraped.hasProductVideo ? '✓' : '✗'} | ولاء: ${scraped.hasLoyaltyProgram ? '✓' : '✗'}
دفع: ${scraped.paymentMethods.join(', ') || 'غير معروف'}
سوشيال: ${Object.keys(scraped.socialLinks || {}).join(', ') || 'لا'}
هاتف: ${scraped.phoneNumbers?.length ? '✓' : '✗'} | WhatsApp Business: ${scraped.hasWhatsAppBusiness ? '✓' : '✗'}` : `المتجر: ${storeUrl} | التخصص: ${industry}`;

  const prompt = `أنت خبير نفسية المتسوق وتحليل التجارة الإلكترونية السعودية.
${imageParts.length ? `لديك ${imageParts.length} صور فعلية من المتجر — استخدمها في تحليلك.` : 'تحليل نصي.'}
المتجر: ${storeUrl} | التخصص: ${industry}
${data}

أجب بـ JSON صارم فقط — ابدأ بـ { مباشرة:
{"psychology":{"buyerPersona":"<وصف الشخصية المستهدفة بجملتين>","purchaseMotivators":["","",""],"trustBarriers":["","",""],"emotionalTriggers":["",""],"conversionProbability":0,"cognitiveLoad":"low|medium|high","attentionFlow":"<أين ينظر العميل أولاً وكيف يتصفح>","sessionReplay":"<تصرفات عميل افتراضي خطوة بخطوة — 5 خطوات>"},
"brand":{"identityScore":0,"premiumFeel":"premium|professional|mid|budget","consistencyScore":0,"personality":"<كلمتان تصفان شخصية البراند>","issues":["",""],"improvements":["",""]},
"pricing":{"score":0,"strategy":"penetration|premium|value|competitive","psychologyUsed":[""],"hasFakeDiscounts":false,"fakeDiscountRisk":"high|medium|low|none","issues":[""],"suggestions":[""]},
"competitors":[{"name":"","url":"","arabicName":"","strength":"","differentiator":""}],
"maturityScore":0,"merchantSuccessScore":0,"healthScore":0,
"missingFeatures":["","",""],"growthOpportunities":["","",""],
"rtlAnalysis":{"score":0,"issues":[""]},
"gulfCommerceReadiness":{"score":0,"localAdaptations":[""],"gaps":[""]}}
competitors: 3 منافسين حقيقيين في ${industry} بالسوق السعودي مع روابطهم.
conversionProbability: 0-100 احتمالية شراء زائر عشوائي.
maturityScore: نضج المتجر 0-100 | merchantSuccessScore: احتمالية النجاح 0-100 | healthScore: صحة المتجر الإجمالية 0-100.`;

  if (imageParts.length) return aiAnalyzeWithVision(prompt, imageParts);
  return aiGenerateClaude(prompt, 5000);
}

// ─── Store Analyzer v4 — Intelligence Engine ─────────────────────────────────
router.post('/analyze', auth,
  [body('storeUrl').isURL({ require_protocol: true }).withMessage('رابط المتجر غير صالح')],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'analyzer', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.message,
      ...perm,
    });

    const { storeUrl } = req.body;
    const category = sanitizeForPrompt(req.body.category, 100);
    const _urlError = validateStoreUrl(storeUrl);
    if (_urlError) return res.status(400).json({ error: _urlError });
    const url = new URL(storeUrl);

    // تحليل جديد دائماً (لا نُرجِع نتيجة مخزّنة) — التخزين يبقى لاستخدام تصدير PDF فقط
    // Phase 1: 5 parallel collectors (Puppeteer handles both screenshots AND scraping)
    const _collectors = await Promise.allSettled([
      fetchSEOFiles(storeUrl),
      fetchPageSpeed(storeUrl),
      takeStoreScreenshots(storeUrl), // Returns screenshots + renderedHtml
      simulateBehavior(storeUrl),
      checkSecurityHeaders(storeUrl),
    ]);
    let [seoFiles, pageSpeed, screenshots, behavioral, security] = _collectors.map(
      (r, i) => r.status === 'fulfilled' ? r.value : (logger.warn(`collector[${i}] failed: ${r.reason?.message?.slice(0,60)}`), { success: false })
    );

    // Primary scraping: Puppeteer rendered HTML (bypasses Cloudflare, full JS execution)
    // Fallback: Axios (for stores where Puppeteer also fails)
    let scraped = { success: false };
    if (screenshots.success && screenshots.renderedHtml) {
      logger.info(`Scraping from Puppeteer HTML (${screenshots.renderedHtml.length} chars)`);
      try {
        scraped = await scrapeStore(storeUrl, screenshots.renderedHtml);
        logger.info(`Puppeteer scrape: ${scraped.success ? `OK — platform: ${scraped.platform}` : 'failed'}`);
      } catch (e) {
        logger.warn(`Puppeteer scrape error: ${e.message?.slice(0, 80)}`);
      }
    }
    if (!scraped.success) {
      logger.info('Trying Axios scraping as fallback...');
      try { scraped = await scrapeStore(storeUrl); }
      catch (e) { scraped = { success: false, error: e.message }; }
    }

    const platform = scraped.success ? scraped.platform
      : (url.hostname.includes('salla') ? 'سلة' : url.hostname.includes('zid') ? 'زد' : 'غير محدد');
    const storeName = (scraped.success && scraped.pageTitle) ? scraped.pageTitle : url.hostname.split('.')[0];
    const benchmark = getIndustryBenchmark(category);
    // لو تعذّرت PageSpeed الحقيقية → تقدير بالذكاء الاصطناعي ليظهر قسم الأداء دائماً
    if (!pageSpeed.success) {
      pageSpeed = await aiEstimatePerformance(scraped.success ? scraped : {}, seoFiles, storeUrl).catch(() => ({ success: false }));
      if (pageSpeed.success) logger.info('PageSpeed: استُخدم التقدير بالذكاء الاصطناعي');
    }
    const trustScore = computeTrustScore(scraped.success ? scraped : {}, seoFiles);
    const technicalChecks = buildTechnicalChecks(scraped.success ? scraped : {}, seoFiles, pageSpeed);

    // Layer 2: Pattern recognition (no AI) + Industry Profile
    const _scrapedData = scraped.success ? scraped : {};
    const _industryKey = detectIndustryKey(_scrapedData);
    const _industryProfile = getProfile(category ? _industryKey : _industryKey);
    const _estimatedVisitors = estimateMonthlyVisitors({
      productCount: _scrapedData.productCount,
      hasReviewSection: _scrapedData.hasReviewSection,
      hasSocialLinks: Object.keys(_scrapedData.socialLinks || {}).length > 0,
    });
    const _patternCtx = {
      industry: category || _scrapedData.detectedIndustry,
      visitors: _estimatedVisitors,
      aov: _industryProfile.benchmarks.avgAOV.p50,
      lcp: pageSpeed.lcp,
      performanceScore: pageSpeed.performanceScore,
      securityScore: security.score,
      ..._scrapedData,
      ...seoFiles,
    };
    const patternIssues = runPatterns(_patternCtx, _patternCtx);
    const _totalLoss = calculateTotalLoss(patternIssues, _patternCtx);

    try {
      // Phase 3: AI calls — 2 parallel groups to avoid Groq rate limits
      const safe = async (fn, name) => { try { return await fn; } catch(e) { logger.warn(`${name} failed: ${e.message?.slice(0,80)}`); return null; } };
      // Group 1: most important calls first
      // كل نداءات الذكاء الاصطناعي بالتوازي دفعة واحدة (Gemini مدفوع يتحمّل التزامن) — تسريع كبير
      const [core, visual, conversion, business, optimizer, psychology] = await Promise.all([
        safe(aiCallCore(scraped, seoFiles, pageSpeed, security, category, benchmark, storeUrl, platform, storeName), 'aiCallCore'),
        safe(aiCallVisual(screenshots, scraped, storeUrl), 'aiCallVisual'),
        safe(aiCallConversion(scraped, behavioral, category, storeUrl), 'aiCallConversion'),
        safe(aiCallBusiness(scraped, category, benchmark, behavioral, security, storeUrl), 'aiCallBusiness'),
        safe(aiCallOptimizer(scraped, category, storeUrl), 'aiCallOptimizer'),
        safe(aiCallPsychology(scraped, screenshots, category, storeUrl), 'aiCallPsychology'),
      ]);

      const visionUsed = visual?.visionUsed || false;
      const visualItems = visual?.items || [];
      const visualScore = visual?.visualScore || 0;

      const croScore = conversion?.croScore || null;
      const coreScore = core?.overallScore || 60;
      const benchmarkingData = {
        industryLabel: benchmark.label,
        overallPercentile: calcPercentile(coreScore, benchmark.avgScore, benchmark.topScore),
        metrics: [
          { name: 'التقييم الكلي', yours: coreScore, avg: benchmark.avgScore, top: benchmark.topScore, percentile: calcPercentile(coreScore, benchmark.avgScore, benchmark.topScore) },
          ...(pageSpeed.success ? [{ name: 'أداء الموقع', yours: pageSpeed.performanceScore, avg: benchmark.avgPerf, top: benchmark.avgPerf + 30, percentile: calcPercentile(pageSpeed.performanceScore, benchmark.avgPerf, benchmark.avgPerf + 30) }] : []),
          ...(croScore !== null ? [{ name: 'تحسين التحويل CRO', yours: croScore, avg: benchmark.avgCRO, top: benchmark.avgCRO + 40, percentile: calcPercentile(croScore, benchmark.avgCRO, benchmark.avgCRO + 40) }] : []),
        ],
      };

      const croSignals = scraped.success ? {
        hasReviews: scraped.hasReviewSection, hasCountdown: scraped.hasCountdown,
        hasUrgency: scraped.hasUrgencyText, hasAddToCart: scraped.hasAddToCartBtn,
        hasWhatsApp: scraped.hasWhatsAppFloat, hasShippingBadge: scraped.hasShippingBadge,
        hasReturnPolicy: scraped.hasReturnPolicy, hasChatWidget: scraped.hasChatWidget,
        hasProductVideo: scraped.hasProductVideo, hasSizeGuide: scraped.hasSizeGuide,
        hasTrustBadges: scraped.hasTrustBadges, hasPaymentBadgesInFooter: scraped.hasPaymentBadgesInFooter,
      } : null;

      await db.query(
        'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'analyzer', { storeUrl, category }, { score: coreScore, trustScore }]
      ).catch(() => {});

      // Load previous snapshot + previous action statuses (parallel, non-fatal)
      const [_snapshotComparison, _previousActions] = await Promise.all([
        compareSnapshots(req.user.id, storeUrl),
        getActions(req.user.id, storeUrl),
      ]);

      const detectedIndustry = scraped.success ? (scraped.detectedIndustry || category || null) : (category || null);
      logger.info(`Analyzer v4: ${storeUrl} — score:${coreScore} trust:${trustScore} vision:${visionUsed} beh:${behavioral.success} sec:${security.score} industry:${detectedIndustry || 'N/A'} health:${psychology?.healthScore ?? 'N/A'}`);

      const _result = {
        // Core
        overallScore: coreScore,
        platform: core?.platform || platform,
        storeName: core?.storeName || storeName,
        summary: core?.summary,
        criteria: core?.criteria || [],
        // Theme + Industry (NEW)
        themeName: scraped.success ? scraped.themeName || null : null,
        themeCode: scraped.success ? scraped.themeCode || null : null,
        detectedIndustry,
        // Layer 2: Visual (ENHANCED)
        visualAudit: visualItems,
        visualScore,
        heroSection: visual?.heroSection || null,
        productImages: visual?.productImages || null,
        brandConsistency: visual?.brandConsistency || null,
        visualAttention: visual?.visualAttention || null,
        premiumFeel: visual?.premiumFeel || null,
        // Layer 3: UX
        ux: core?.ux,
        // Layer 4: CRO (ENHANCED)
        cro: { score: conversion?.croScore || 0, items: conversion?.cro?.items || [] },
        conversionProbability: conversion?.conversionProbability || null,
        checkoutFriction: conversion?.checkoutFriction || null,
        offerStrength: conversion?.offerStrength || null,
        // Layer 5: SEO
        seo: core?.seo,
        // Layer 6: Behavioral
        behavioral: {
          loadTime: behavioral.loadTime,
          scrollDepth: behavioral.scrollDepth,
          productClickable: behavioral.productClickable,
          cartFriction: behavioral.cartFriction,
          insights: conversion?.behavioral?.insights || [],
        },
        // Layer 7: Industry
        industryAudit: business?.industry,
        // Layer 8: Trust
        trustScore,
        trust: conversion?.trust,
        // Layer 9: Commerce
        commerce: conversion?.commerce,
        // Layer 10: Benchmarking
        benchmarking: benchmarkingData,
        // Layer 11: Revenue
        revenue: business?.revenue,
        // Layer 12+13: Actions with priority scores
        actions: business?.actions || [],
        // Layer 14: Summary (quickWins/strengths/weaknesses from conversion)
        quickWins: conversion?.quickWins || [],
        strengths: conversion?.strengths || [],
        weaknesses: conversion?.weaknesses || [],
        // Layer 15: Autonomous Optimizer
        optimizer,
        // Intelligence Engine (NEW v4)
        psychology: psychology?.psychology || null,
        brand: psychology?.brand || null,
        pricing: psychology?.pricing || null,
        competitors: psychology?.competitors || [],
        maturityScore: psychology?.maturityScore ?? null,
        merchantSuccessScore: psychology?.merchantSuccessScore ?? null,
        healthScore: psychology?.healthScore ?? null,
        missingFeatures: psychology?.missingFeatures || [],
        growthOpportunities: psychology?.growthOpportunities || [],
        rtlAnalysis: psychology?.rtlAnalysis || null,
        gulfCommerceReadiness: psychology?.gulfCommerceReadiness || null,
        // Technical data (for technical tab)
        technicalData: {
          checks: technicalChecks,
          pageSpeed: pageSpeed.success ? pageSpeed : null,
          tracking: scraped.success ? scraped.technologies : [],
          croSignals,
          seoFiles,
          security: { score: security.score || 0, headers: security.headers || {} },
          behavioral: behavioral.success
            ? { loadTime: behavioral.loadTime, scrollDepth: behavioral.scrollDepth, productClickable: behavioral.productClickable, cartFriction: behavioral.cartFriction }
            : null,
        },
        visionUsed,
        pageSpeedUsed: pageSpeed.success,
        // v5: Pattern-based issues (Layer 2, no AI) + Industry
        patternIssues,
        estimatedVisitors: _patternCtx.visitors,
        totalMonthlyLoss: _totalLoss.totalMonthly,
        totalYearlyLoss: _totalLoss.totalYearly,
        industryKey: _industryKey,
        industryTips: _industryProfile.industryTips,
        industryRequired: _industryProfile.required,
        // v5: Snapshot comparison + action statuses
        snapshotComparison: _snapshotComparison,
        previousActions: _previousActions,
        // Scraped store data (for display in frontend)
        scraped: scraped.success ? {
          pageTitle: scraped.pageTitle, platform: scraped.platform,
          themeName: scraped.themeName, themeCode: scraped.themeCode,
          paymentMethods: scraped.paymentMethods || [],
          socialLinks: scraped.socialLinks || {},
          technologies: scraped.technologies || [],
          hasSSL: scraped.hasSSL || false, hasCDN: scraped.hasCDN || false,
          hasStructuredData: scraped.hasStructuredData || false, hasRobotsMeta: scraped.hasRobotsMeta || false,
          hasSearch: scraped.hasSearch || false, hasCart: scraped.hasCart || false,
          hasWishlist: scraped.hasWishlist || false, hasMobileMenu: scraped.hasMobileMenu || false,
          contactEmail: scraped.contactEmail || null,
          phoneNumbers: scraped.phoneNumbers || [],
          h1s: scraped.h1s || [], imgsMissingAlt: scraped.imgsMissingAlt || 0,
          totalImgs: scraped.totalImgs || 0, scriptsCount: scraped.scriptsCount || 0,
          lang: scraped.lang || null, productCount: scraped.productCount || 0,
          // Saudi trust & legal
          hasTaxNumber: scraped.hasTaxNumber || false,
          hasBusinessVerification: scraped.hasBusinessVerification || false,
          hasVATBadge: scraped.hasVATBadge || false,
          hasCommercialReg: scraped.hasCommercialReg || false,
          hasZATCA: scraped.hasZATCA || false,
          // CRO signals
          hasReviewSection: scraped.hasReviewSection || false,
          hasReturnPolicy: scraped.hasReturnPolicy || false,
          hasWhatsAppFloat: scraped.hasWhatsAppFloat || false,
          hasPaymentBadgesInFooter: scraped.hasPaymentBadgesInFooter || false,
          hasTrustBadges: scraped.hasTrustBadges || false,
          hasChatWidget: scraped.hasChatWidget || false,
          hasShippingBadge: scraped.hasShippingBadge || false,
          hasBreadcrumb: scraped.hasBreadcrumb || false,
          hasQuickView: scraped.hasQuickView || false,
          hasSearchFilter: scraped.hasSearchFilter || false,
          hasProductGallery: scraped.hasProductGallery || false,
          hasProductVideo: scraped.hasProductVideo || false,
          lazyLoadedImgs: scraped.lazyLoadedImgs || 0,
          hasOGImage: scraped.hasOGImage || false,
          metaDesc: scraped.metaDesc || '',
          canonical: scraped.canonical || '',
          success: true,
        } : null,
        // Screenshots (base64, from Puppeteer)
        screenshots: screenshots.success ? screenshots : null,
      };
      // ─── ترشيح الخدمات: المحرك يضيّق القائمة → الذكاء الاصطناعي يختار ويعلّل ───
      try {
        const candidates = servicesCatalog.recommendServices({ ..._result, _storeUrl: storeUrl }, 16);
        let recs = candidates.slice(0, 2); // احتياطي = ترتيب المحرك (خدمتان)
        if (candidates.length) {
          try {
            // نقاط الضعف الفعلية من التقرير (المعايير الراسبة + الضعيفة)
            const failed = (_result.criteria || []).filter(c => c.status !== 'pass').map(c => c.name);
            const issues = [...new Set([...(failed), ...candidates.flatMap(s => s.reasons || [])])].slice(0, 12);
            const niche = category || _result.detectedIndustry || 'غير محدد';
            const ctx = `المتجر: ${_result.storeName || '-'} (منصة ${platform || '-'}).
نشاط/تخصص المتجر: ${niche}.
التقييم العام: ${_result.overallScore ?? '-'}/100.
أبرز نقاط الضعف المكتشفة في التقرير: ${issues.join('، ') || 'عامة'}.`;
            const picked = await aiPickServices(candidates, ctx, 2);
            recs = picked; // قد تكون خدمة واحدة أو اثنتين أو لا شيء — الأهم الدقة
          } catch (e) { logger.warn(`aiPickServices failed: ${e.message?.slice(0, 80)}`); }
        }
        _result.recommendedServices = recs;
      } catch (e) {
        logger.warn(`recommendServices failed: ${e.message?.slice(0, 80)}`);
        _result.recommendedServices = [];
      }

      if (coreScore !== 60 || (_result.criteria || []).length > 0) await setCached(storeUrl, category, _result);
      saveSnapshot(req.user.id, storeUrl, _result).catch(() => {});
      // حفظ التحليل كطلب يصل للأدمن (ملخّص مُركّز للتقرير)
      saveAnalysisSubmission(req.user.id, storeUrl, category, _result).catch(() => {});
      res.json({ ..._result, remaining: perm.remaining, used: perm.used, limit: perm.limit });
    } catch (err) {
      logger.error('Analyzer v4 error:', err.message);
      const msg = err.message?.includes('quota') || err.message?.includes('429')
        ? 'تجاوزت حد استخدام الذكاء الاصطناعي — حاول بعد دقيقة.'
        : err.message?.includes('fetch') || err.message?.includes('ECONNREFUSED')
        ? 'تعذّر الاتصال بالمتجر — تأكد من الرابط وحاول مرة أخرى.'
        : err.message?.includes('JSON') || err.message?.includes('parse')
        ? 'الذكاء الاصطناعي أعاد استجابة غير متوقعة — حاول مرة أخرى.'
        : 'حدث خطأ أثناء التحليل — حاول مرة أخرى أو جرّب رابطاً مختلفاً.';
      res.status(500).json({ error: msg, detail: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
  })
);

// ─── Product Description Generator ───────────────────────────────────────────
router.post('/generate', auth,
  [
    body('productName').trim().isLength({ min: 2 }).withMessage('اسم المنتج مطلوب'),
    body('tone').optional().isIn(['luxury', 'friendly', 'professional', 'youthful']),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'generator', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.message,
      ...perm,
    });

    // صور المنتج (اختيارية) — تُحلَّل بالـVision لإثراء الوصف
    const imageParts = (Array.isArray(req.body.images) ? req.body.images : [])
      .slice(0, 4)
      .map(img => {
        if (!img || typeof img !== 'string') return null;
        const m = img.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        const data = m ? m[2] : img.replace(/^data:[^,]+,/, '');
        const mimeType = m ? m[1] : 'image/jpeg';
        if (!data || data.length > 8_000_000) return null; // ~6MB لكل صورة
        return { inlineData: { mimeType, data } };
      })
      .filter(Boolean);

    const _raw = req.body;
    const productName    = sanitizeForPrompt(_raw.productName, 100);
    const features       = sanitizeForPrompt(_raw.features, 1500);

    if (!imageParts.length && features.length < 6) {
      return res.status(400).json({ error: 'أضف نقاط بيع سريعة أو ارفق صورة واحدة على الأقل' });
    }
    const category       = sanitizeForPrompt(_raw.category, 120); // اختياري — يُكتشف تلقائياً
    const brand          = sanitizeForPrompt(_raw.brand, 80);
    const keywords       = sanitizeForPrompt(_raw.keywords, 200);
    const tone           = _raw.tone || 'luxury';
    const length         = ['short', 'medium', 'detailed'].includes(_raw.length) ? _raw.length : 'medium';
    const angle          = ['gift', 'professional', 'saving', 'luxury', 'auto'].includes(_raw.angle) ? _raw.angle : 'auto';
    const targetAudience = sanitizeForPrompt(_raw.targetAudience, 200);
    const tones = {
      luxury:       'فاخر وراقٍ — يعكس الحصرية والجودة الحقيقية',
      friendly:     'ودود ودافئ — قريب من العميل كصديق يوصي بمنتج',
      professional: 'احترافي ومتخصص — يركز على المواصفات والأداء والأرقام',
      youthful:     'شبابي وعصري — حيوي ومرح بلغة الجيل الجديد',
    };
    const selectedTone = tones[tone] || tones.luxury;
    const angleMap = {
      gift:         'زاوية الهدية — صوّر المنتج كهدية مثالية: لمن، ولأي مناسبة، والأثر العاطفي للمُهدى إليه.',
      professional: 'زاوية احترافية — ركّز على الأداء والمواصفات والموثوقية والقيمة العملية.',
      saving:       'زاوية القيمة والتوفير — أبرز ما يوفّره المنتج (وقت/مال/جهد) ولماذا يستحق سعره.',
      luxury:       'زاوية الفخامة — أبرز الحصرية والتميّز والتفاصيل الراقية وتجربة الاقتناء.',
      auto:         'اختر الزاوية التسويقية الأنسب لطبيعة المنتج تلقائياً.',
    };
    const lengthMap = {
      short:    { words: 'بحد أدنى 180 كلمة', secs: '٣ أقسام', pts: '٣ نقاط لكل قسم' },
      medium:   { words: 'بحد أدنى 400 كلمة', secs: '٤ أقسام', pts: '٤-٥ نقاط لكل قسم' },
      detailed: { words: 'بحد أدنى 650 كلمة (لا تختصر إطلاقاً)', secs: '٥ أقسام', pts: '٦ نقاط لكل قسم' },
    };
    const L = lengthMap[length];

    const merchantCtx = [
      `اسم المنتج: ${productName}`,
      category ? `تلميح التصنيف من التاجر: ${category}` : '',
      brand ? `الماركة: ${brand}` : '',
      features ? `نقاط بيع/ملاحظات من التاجر:\n${features}` : '',
      targetAudience ? `الجمهور: ${targetAudience}` : '',
    ].filter(Boolean).join('\n');

    try {
      // ═══ الخطوة 1: استخراج الخصائص الحقيقية (من الصور + المدخلات) ═══
      const extractPrompt = `أنت محلّل منتجات خبير. مهمتك استخراج الخصائص الحقيقية للمنتج فقط — لا تكتب تسويقاً، لا تخترع ما لا تعرفه.

${merchantCtx}
${imageParts.length ? `\n📷 مرفق ${imageParts.length} صورة فعلية للمنتج. افحصها بدقة واستخرج كل ما تراه: الشكل، الألوان الفعلية، الخامة/المادة، الحجم النسبي، الأجزاء والتفاصيل، طريقة الاستخدام الظاهرة، النصوص/الشعارات إن وُجدت.` : ''}

استخرج بدقة. إن لم تكن متأكداً من خاصية، لا تذكرها. أعِد JSON فقط:
{
"category": "<التصنيف الدقيق المكتشف للمنتج بالعربية>",
"productType": "<نوع المنتج تحديداً>",
"attributes": ["<خاصية حقيقية ملموسة: مادة/لون/حجم/سعة/آلية عمل>", "..."],
"visibleDetails": ["<تفصيلة مرئية من الصور إن وُجدت>", "..."],
"useCases": ["<حالة استخدام واقعية>", "..."],
"audience": "<الجمهور الأنسب>"
}`;
      const facts = imageParts.length
        ? await aiAnalyzeWithVision(extractPrompt, imageParts)
        : await aiGenerateClaude(extractPrompt, 2000, { temperature: 0.3 });

      const detectedCategory = sanitizeForPrompt(facts.category || category || 'عام', 120);
      const factsBlock = JSON.stringify({
        category: facts.category, productType: facts.productType,
        attributes: facts.attributes, visibleDetails: facts.visibleDetails,
        useCases: facts.useCases, audience: facts.audience,
      });

      // ═══ الخطوة 2: كتابة المحتوى بناءً على الخصائص المستخرجة ═══
      const primaryKw = keywords || productName;
      const writePrompt = `أنت كاتب إعلانات (Copywriter) محترف من الطراز الأول، متخصص في المتاجر الإلكترونية الخليجية، وخبير SEO عربي. تكتب بعربية فصيحة راقية وسلسة، دافئة ومقنعة، قريبة من ذائقة المتسوّق في الخليج.

النبرة: ${selectedTone}
الزاوية التسويقية: ${angleMap[angle]}
التصنيف المكتشف: ${detectedCategory}
الكلمة المفتاحية الرئيسية: "${primaryKw}"${keywords ? `\nكلمات مفتاحية إضافية تُدمج طبيعياً: ${keywords}` : ''}

الخصائص الحقيقية المستخرجة للمنتج (اعتمد عليها ولا تخترع غيرها):
${factsBlock}
${features ? `\nملاحظات إضافية من التاجر: ${features}` : ''}

👤 مخاطبة العميل (مهم جداً):
- اكتب وكأنك تحدّث المتسوّق الخليجي مباشرة بصيغة "أنت/تخيّل/ستلاحظ"، بأسلوب راقٍ يحترم ذكاءه.
- اربط المنتج بمواقف حياتية وذائقة المنطقة عند المناسبة (المجالس والضيافة، المناسبات والأعراس، رمضان والعيد، الهدايا، أجواء الصيف الحار، العمل والدوام) — بشكل طبيعي وذوّاق، دون مبالغة ودون حشو كلمات مثل "السوق السعودي".
- لمسة عاطفية مقنعة + برهان عقلي (مواصفة/رقم) في كل فكرة.

🚫 قواعد الجودة (صارمة):
- ممنوع منعاً باتاً هذه العبارات وأمثالها: "الأفضل في السوق"، "جودة عالية"، "عالي الجودة"، "خامة ممتازة"، "يلبي كل احتياجاتك"، "بأعلى المعايير"، "لا مثيل له"، "تجربة لا تُنسى"، "بكل احترافية"، "متانة فائقة". لا تُلصق وصفاً مبهماً بعد المعلومة.
- لا تكرّر نفس الخاصية في أكثر من نقطة — كل نقطة تتناول جانباً مختلفاً (مادة، تصميم، استخدام، راحة، عناية، مناسبة...).
- نوّع بدايات الجُمل؛ لا تبدأ نقطتين متتاليتين بنفس الكلمة.
- كل نقطة = جملة كاملة (١٠-٢٥ كلمة): مواصفة ملموسة (مادة/رقم/مقاس/آلية) ← الفائدة الواقعية للعميل (إطار Feature→Benefit).

🔍 تحسين محركات البحث (SEO) — إلزامي:
- ضع الكلمة المفتاحية الرئيسية "${primaryKw}" في: أول جملة من المقدمة، وفي عنوان قسم واحد على الأقل، وكرّرها ٣-٥ مرات طبيعياً عبر الوصف (بدون حشو).
- pageTitle يبدأ بالكلمة المفتاحية، وpageDescription تتضمّنها في أول ٦٠ حرفاً.
- tags = عبارات بحث حقيقية يكتبها المتسوّق فعلاً (مزيج كلمات قصيرة وطويلة Long-tail).

مثال نقطة سيئة (ممنوعة): "خامة عالية الجودة تدوم طويلاً".
مثال نقطة ممتازة (مطلوبة): "قماش قطني ممشّط بوزن 220 غرام يمنحك ملمساً ناعماً ويحافظ على القَصّة بعد الغسيل المتكرر".

🎯 المخرجات (5 عناصر فقط):
- وصف منسّق: مقدمة (intro من ٣-٤ أسطر تخاطب العميل وتضع الكلمة المفتاحية) + ${L.secs} (${L.pts})، الإجمالي ${L.words} — التزم بالحد الأدنى ولا تختصر. الأقسام حسب طبيعة "${detectedCategory}".
- tags: ٨-١٢ وسماً (عربية + بعض الإنجليزية للماركة) كلمات بحث حقيقية.
- pageTitle: بين ٤٥ و٦٠ حرفاً (إلزامي، املأ المساحة) يبدأ بالكلمة المفتاحية${brand ? ' ويضم الماركة' : ''} + ميزة.
- pageDescription: بين ١٥٠ و١٦٠ حرفاً (إلزامي) — جملة تسويقية مقنعة تتضمّن الكلمة المفتاحية مبكراً + دعوة للشراء.
- designs: محتوى تصميمين مختلفي الزاوية (title, headline, subheadline, cta, visual).

أجب بـ JSON فقط بدون markdown، ابدأ بـ { :
{
"intro": "<مقدمة محددة لا عامة>",
"sections": [{"heading": "<عنوان>", "points": ["<نقطة ملموسة>"]}],
"tags": ["<وسم>"],
"pageTitle": "<حتى 60 حرف>",
"pageDescription": "<150-160 حرف>",
"designs": [
  {"title": "<اسم التصميم 1>", "headline": "<جملة رئيسية>", "subheadline": "<فرعية>", "cta": "<حث>", "visual": "<مشهد بصري>"},
  {"title": "<اسم التصميم 2 بزاوية مختلفة>", "headline": "<جملة رئيسية>", "subheadline": "<فرعية>", "cta": "<حث>", "visual": "<مشهد بصري مختلف>"}
]
}`;
      const content = await aiGenerateClaude(writePrompt, 8000, { temperature: 0.75 });

      // تطبيع + تدقيق أطوال الحقول برمجياً
      if (!Array.isArray(content.tags)) content.tags = [];
      if (!Array.isArray(content.designs)) content.designs = [];
      if (!Array.isArray(content.sections)) content.sections = [];
      content.detectedCategory = detectedCategory;
      if (typeof content.pageTitle === 'string' && content.pageTitle.length > 60) {
        content.pageTitle = content.pageTitle.slice(0, 60).replace(/\s+\S*$/, '').trim();
      }
      if (typeof content.pageDescription === 'string' && content.pageDescription.length > 160) {
        content.pageDescription = content.pageDescription.slice(0, 160).replace(/\s+\S*$/, '').trim();
      }
      // نسخة نصّية كاملة للوصف (للحفظ/التوافق)
      content.description = [content.intro || '', ...content.sections.map(s =>
        `${s.heading}:\n` + (Array.isArray(s.points) ? s.points.map(p => `• ${p}`).join('\n') : '')
      )].filter(Boolean).join('\n\n');

      await db.query(
        'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'generator', { productName, detectedCategory, brand, tone, length, angle, images: imageParts.length }, content]
      ).catch(() => {});
      res.json({ ...content, remaining: perm.remaining, used: perm.used, limit: perm.limit });
    } catch (err) {
      logger.error('Generator error:', err.message);
      res.status(500).json({ error: 'حدث خطأ أثناء التوليد. تأكد من مفتاح الذكاء الاصطناعي وحاول مرة أخرى.' });
    }
  })
);

// ─── Bulk Product Description Generator (CSV / عدة منتجات) ────────────────────
router.post('/generate-bulk', auth, ar(async (req, res) => {
  const perm = await checkToolPermission(req.user.id, 'generator', req.user.tools_access);
  if (!perm.allowed) return res.status(403).json({ error: perm.message, ...perm });

  let products = Array.isArray(req.body.products) ? req.body.products : [];
  products = products
    .map(p => ({
      name: sanitizeForPrompt(p.name || p.productName || '', 100),
      category: sanitizeForPrompt(p.category || '', 100),
      features: sanitizeForPrompt(p.features || '', 600),
    }))
    .filter(p => p.name.length >= 2)
    .slice(0, 12); // حد أقصى 12 منتجاً لكل دفعة

  if (!products.length) return res.status(400).json({ error: 'لا توجد منتجات صالحة. تأكد من وجود اسم لكل منتج.' });

  const tone = ({ luxury: 'فاخر وراقٍ', friendly: 'ودود ودافئ', professional: 'احترافي ومتخصص', youthful: 'شبابي وعصري' })[req.body.tone] || 'احترافي ومتخصص';

  const genOne = async (p) => {
    const prompt = `أنت كاتب محتوى منتجات محترف وخبير SEO عربي للسوق الخليجي. اكتب محتوى دقيقاً للمنتج التالي بنبرة ${tone}.
المنتج: ${p.name}
${p.category ? `التصنيف: ${p.category}` : ''}
${p.features ? `نقاط/مميزات: ${p.features}` : ''}

قواعد: خاطب المتسوّق الخليجي، ممنوع العبارات المبتذلة ("جودة عالية"، "الأفضل"، "متانة فائقة")، كل نقطة معلومة ملموسة + فائدة. ادمج كلمة مفتاحية طبيعياً.
أعد JSON فقط:
{
"description": "<وصف 150-250 كلمة في فقرة أو فقرتين>",
"tags": ["<وسم>","<وسم>","<وسم>","<وسم>","<وسم>","<وسم>"],
"pageTitle": "<عنوان صفحة 45-60 حرف يبدأ بالكلمة المفتاحية>",
"pageDescription": "<وصف صفحة 150-160 حرف>"
}`;
    try {
      const c = await aiGenerateClaude(prompt, 2500, { temperature: 0.7 });
      if (c.pageTitle && c.pageTitle.length > 60) c.pageTitle = c.pageTitle.slice(0, 60).replace(/\s+\S*$/, '');
      if (c.pageDescription && c.pageDescription.length > 160) c.pageDescription = c.pageDescription.slice(0, 160).replace(/\s+\S*$/, '');
      db.query('INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'generator', { productName: p.name, bulk: true }, c]).catch(() => {});
      return { name: p.name, ok: true, description: c.description || '', tags: c.tags || [], pageTitle: c.pageTitle || '', pageDescription: c.pageDescription || '' };
    } catch (e) {
      return { name: p.name, ok: false, error: 'تعذّر توليد هذا المنتج' };
    }
  };

  // معالجة على دفعات صغيرة (3 بالتوازي) لتسريع دون إرهاق الـAPI
  const results = [];
  for (let i = 0; i < products.length; i += 3) {
    const batch = products.slice(i, i + 3);
    results.push(...await Promise.all(batch.map(genOne)));
  }
  res.json({ results, count: results.length });
}));

// ─── Request Tool Access ──────────────────────────────────────────────────────
router.post('/request-access', auth,
  [
    body('toolName').notEmpty().withMessage('اسم الأداة مطلوب'),
    body('reason').trim().isLength({ min: 10 }).withMessage('يرجى توضيح السبب (10 أحرف على الأقل)'),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { toolName, reason } = req.body;

    const { rows: ur } = await db.query('SELECT tools_access FROM users WHERE id=$1', [req.user.id]);
    if (ur[0]?.tools_access?.[toolName] === true)
      return res.status(400).json({ error: 'لديك بالفعل وصول لهذه الأداة' });

    const { rows: ex } = await db.query(
      'SELECT id FROM tool_access_requests WHERE user_id=$1 AND tool_name=$2 AND status=$3',
      [req.user.id, toolName, 'pending']
    );
    if (ex.length) return res.status(400).json({ error: 'لديك طلب معلق بالفعل. ستُبلَّغ عند المراجعة.' });

    const { rows } = await db.query(
      'INSERT INTO tool_access_requests(user_id,tool_name,reason) VALUES($1,$2,$3) RETURNING id',
      [req.user.id, toolName, reason]
    );
    res.status(201).json({ message: 'تم إرسال طلبك بنجاح. سيتواصل معك الفريق قريباً.', id: rows[0].id });
  })
);

// ─── AI Chat ─────────────────────────────────────────────────────────────────
const CHAT_FAQ = `
--- محادثات حقيقية من الفريق — ردّ بنفس الأسلوب تماماً ---

[سؤال: أيش الأفضل سلة أم زد؟]
الاثنين منصات ممتازة بس كل وحدة لها مزاياها 👍🏻
سلة: خيارات تصميم أكثر، تحكم أعمق، مناسبة إذا تبي تخصيص المتجر بشكل كامل
زد: أسرع في الإعداد، واجهة أبسط، مناسبة إذا تبي تبدأ بسرعة
في الأخير يعتمد على: ميزانيتك، نوع منتجاتك، ومدى احتياجك للتخصيص ✅

[سؤال: ما متطلبات فتح حساب تمارا / تابي / إمكان؟]
حبيبي هذي تفاصيلها 👇🏻

تمارا ✅
- سجل تجاري أو وثيقة عمل حر
- شهادة آيبان بنكي

تابي ✅
- سجل تجاري أو وثيقة عمل حر
- شهادة آيبان بالإنجليزية
- صورة العنوان الوطني

إمكان ✅
- سجل تجاري
- شهادة ضريبة

المطلوب من الكل:
صورة الهوية + بريد + رقم جوال + اسم المتجر + رابط المتجر

[سؤال: هل الحملة الإعلانية مضمونة؟]
الحملة عشان تنجح تعتمد على أشياء كثيرة 💡
- جودة المحتوى وتأثيره
- ميزانية الحملة
- نوع المنتج
- وإدارة الحملة

بالنسبة للتسويق والحملات الإعلانية، ما في شيء اسمه "ضمان نتائج" بشكل مؤكد — أي أحد يقول لك كذا يكذب عليك بصراحة 😅
الصح: نبدأ بتجربة، نحدد الأشياء الناجحة، نطورها، ونوقف اللي ما يشتغل — وهذا اللي نشتغل عليه معك

[سؤال: السيو يحتاج متابعة؟]
أيوه والله يحتاج متابعة 💯
النتائج تبدأ تظهر بعد 3 أشهر تقريباً، ونشتغل شهرياً على:
- تحسين المحتوى ومتابعة الأداء
- بناء باكلينكس خارجية
- كتابة مقالات متخصصة

الأسباب اللي تأثر على ترتيب المتجر في جوجل:
- عمر الدومين (هل المتجر جديد؟)
- حجم المنافسة لمنتجاتك في محركات البحث
- الكلمات المفتاحية المستخدمة في المنتجات
- سرعة الموقع وتجربة المستخدم

وهذي كلها نشتغل عليها معك 👍🏻

[سؤال: ما متطلبات التسجيل في تطبيقات التوصيل؟]
هذي المتطلبات الأساسية 👇🏻
- سجل تجاري أو وثيقة عمل حر
- الشهادة الضريبية (إن وجدت)
- العنوان الوطني
- شهادة آيبان بنكي
- إيميل + رقم جوال + رقم الفرع
- لوقو الشعار + صور المنتجات
- المنيو على واتساب
- ملف Excel بالمنتجات (الاسم + الفئة + الأسعار + الصور)

[سؤال: تسوون الدفع بعد التنفيذ؟ / ما أبغى أدفع قبل]
صدقونا 🙏🏼
نعتذر منكم، جميع خدماتنا تتم بالدفع المقدم وهذا نظام ثابت نعتمده مع كل عملائنا
والحمد لله سبق شركاءنا بخدمة شركات وأفراد وتجارين ومتاجرهم، وكانت التجربة على قدر الثقة وأكثر
ولذلك نعطيكم ضمان ذهبي 🥇: في حال ما تم تنفيذ الخدمة لأي سبب، سيتم إرجاع مبلغ الخدمة كاملاً
وقدروني ثقتكم 🙏🏼

[سؤال: كم أسعار تصوير UGC؟]
الخدمة الأساسية 👇🏻
1️⃣ فيديو UGC احترافي مع تعليق صوتك — 450 ريال
إن حاب تضيف أكثر:
2️⃣ فيديوين — +370 ريال (الإجمالي 828 ريال)
3️⃣ ثلاثة فيديوهات — +530 ريال (الإجمالي 998 ريال)
كل فيديو بإخراج مختلف — يوضح الفكرة ويوصل الرسالة بشكل جذاب وسلس 🎬

[سؤال: ما أبغى اسمي يظهر للعميل بالحساب البنكي]
وضّح لك النقاط 👇🏻
1️⃣ اسم الحساب البنكي لازم يطابق اسم التمثيل المستخدم في المتجر
2️⃣ التمثيل في المتاجر يكون إما: وثيقة عمل حر أو سجل تجاري
3️⃣ إذا كان التمثيل بوثيقة عمل حر: الحساب البنكي يكون باسمك الشخصي
الاستثناء الوحيد: إذا فعّلت التحويل البنكي المباشر ووضعت آيبانك الخاص — ما يظهر اسمك للعميل

ملاحظة مهمة: في منصة سلة العملاء لا يدفعون لك مباشرة، بل يدفعون للمنصة وهي تحول لك — لذا اسم حسابك ما يظهر أصلاً 😊

[سؤال: ما فائدة تصوير UGC ولماذا هو مهم؟]
هذا شيء بسيط بس قوي جداً 😂
الإعلان الناجح لازم يشرح المنتج ويوصل الرسالة بطريقة جذابة — وهنا يجي دور UGC
المميزات اللي نضيفها في الفيديو:
✅ شخص يتكلم بأسلوب طبيعي مميز يجذب العيون أول ثانيتين
✅ نص CTA واضح مثل "اطلبه الآن" أو "قبل نفاد الكمية"
✅ ذكر السعر والعرض بوضوح
✅ خلفية حياتية أو منزلية تعطي إحساس حقيقي للمنتج

[سؤال: هل تقدرون تسجلون المتجر في برنامج حظر سلة للاشتراكات؟]
نعتذر، الحظر متاح فقط لأسر منتجة في حال عندك سجل تجاري 🙏🏼
إن كان عندك سجل تجاري وتبي تطلع من برنامج أسر منتجة، هذا يعتمد على فئة منتجاتك وتقدر تتواصل مع سلة مباشرة لهذا الموضوع

[سؤال: إصدار وثيقة عمل حر]
أيوه نقدر نساعدك 👍🏻
الشروط:
- عمرك +18 سنة
- يمكن تسجيلها بالجوال أو بالهوية
المتطلبات اللي تحتاجها من عندنا: رقم هوية + عنوان وطني + رقم جوال + اسم المتجر + الأنشطة المطلوبة

[سؤال: فتح حساب بنكي تجاري]
اكتب إلينا في الشات وراح نحتاج منك 👇🏻
- رقم هويتك الوطنية
- العنوان الوطني الكامل
- رقم الجوال
- رقم الفرع
- اللوقو (الشعار)
- اسم المتجر
- رابط المتجر

=== نهاية الأمثلة ===`;

// يبني سياق المتجر المُحلّل + الخدمات المُرشّحة لحقنه في معرفة المساعد
function buildStoreContext(context) {
  if (!context || typeof context !== 'object') return '';
  const parts = [];
  const name = sanitizeForPrompt(context.storeName, 80);
  if (name) parts.push(`اسم المتجر: ${name}`);
  if (typeof context.score === 'number') parts.push(`التقييم العام: ${context.score}/100`);
  const problems = Array.isArray(context.problems)
    ? context.problems.slice(0, 8).map(p => sanitizeForPrompt(p, 80)).filter(Boolean) : [];
  if (problems.length) parts.push(`المشاكل المكتشفة:\n- ${problems.join('\n- ')}`);
  const services = Array.isArray(context.services)
    ? context.services.slice(0, 5).map(s => {
        const nm = sanitizeForPrompt(s.name, 90);
        if (!nm) return null;
        const price = s.price > 0 ? `${s.price} ${sanitizeForPrompt(s.currency || 'SAR', 6)}` : 'مجاناً';
        const url = sanitizeForPrompt(s.url, 200);
        const why = Array.isArray(s.reasons) && s.reasons.length
          ? ` (تحل: ${s.reasons.slice(0, 2).map(r => sanitizeForPrompt(r, 70)).join('، ')})` : '';
        return `- ${nm} — ${price}${url ? ' — ' + url : ''}${why}`;
      }).filter(Boolean) : [];
  if (services.length) parts.push(`الخدمات المُرشّحة لهذا المتجر (رشّحها للمستخدم بثقة مع الرابط):\n${services.join('\n')}`);
  if (!parts.length) return '';
  return `\n\n=== سياق المتجر الذي حلّله المستخدم للتو ===\n${parts.join('\n')}\n=== نهاية السياق ===`;
}

const buildChatSystem = (userName = null, context = null) => `أنت موظف دعم من فريق "خبراء المنصات" — متخصصين في المتاجر الإلكترونية على سلة وزد.
اسمك: تاجر. تتكلم سعودي عامي طبيعي تماماً — مثل شخص حقيقي يرد على واتساب.
${userName ? `المستخدم الحالي اسمه ${userName}، نادِه باسمه بشكل طبيعي في المحادثة.` : ''}

شخصيتك:
أنت شخص ودود ومتعاون، تحب تساعد التجار وما تحب تطول في الكلام بدون فايدة.
تتكلم بثقة وما تتردد. إيموجيات بشكل طبيعي وبدون مبالغة 🙏🏼👍🏻✅

ما تقوله أبداً:
- "بالطبع" / "بكل سرور" / "يسعدني مساعدتك" — هذي ردود روبوتية ممنوعة
- لا تعيد السؤال اللي وُجّه لك
- لا تكتب مقدمة قبل الإجابة
- لا تكتب "وفقاً لمعلوماتي" أو "استناداً إلى"

خدماتنا:
- مساعد التاجر (أداتنا الأبرز ⭐): مساعد ذكي متكامل — يربط متجرك (سلة/زد) ويحلّله تلقائياً، يعطيك لوحة إحصائيات ذكية (التقييم العام، عدد المنتجات، الصفحات، الزيارات بعد ربط جوجل أناليتكس)، توليد أوصاف ومحتوى للمنتجات، مراقبة المنافسين، تحليل التسعير، خطة عمل، وتوقّع الأداء. يتحدّث مع كل مزامنة. لو حد سأل "وش يفرقني" أو "من وين أبدأ" رشّح له مساعد التاجر أولاً (صفحته: pages/assistant.html). فيه باقات اشتراك (الأساسية/النمو/الأعمال) وتجربة مجانية.
- محلل المتجر: تحليل شامل — SEO + تصميم + Core Web Vitals + لقطات شاشة فعلية بالذكاء الاصطناعي
- مولّد محتوى: أوصاف منتجات عربية احترافية
- مولّد صور: صور تسويقية بالذكاء الاصطناعي
- كوبونات: خصومات على سلة وزد
- تقويم المواسم: مناسبات تجارية سعودية طوال السنة
- خدمات: تصميم متاجر، سوشيال ميديا، SEO، إعلانات، UGC، تطبيقات توصيل، وثيقة عمل حر
${(() => { const c = servicesCatalog.catalogSummaryForChat(); return c ? `\nقائمة خدماتنا المتاحة للبيع (استخدمها عند الترشيح):\n${c}\n` : ''; })()}
${CHAT_FAQ}
${buildStoreContext(context)}

--- قواعد الرد ---
1. إذا السؤال مغطى في المحادثات أعلاه: رد بنفس أسلوبها حرفياً
2. إذا السؤال عن التجارة الإلكترونية بشكل عام: أجب من معرفتك بنفس الأسلوب السعودي العامي
3. إذا فيه سياق متجر محلّل أعلاه: رشّح الخدمات المناسبة من القائمة بثقة، واربط كل خدمة بالمشكلة التي تحلها، وأعطِ الرابط
4. إذا ما عندك إجابة: قل "والله ما عندي تفاصيل كافية عن هذا، تواصل مع الفريق على واتساب"
5. الرد يكون مباشر ومختصر — إلا إذا السؤال يحتاج قائمة
6. لا تختم بـ"إذا عندك أسئلة أخرى" أو ما يشابهها`;


router.post('/chat', optionalAuth,
  [
    body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('الرسالة فارغة أو طويلة جداً'),
    body('history').optional().isArray({ max: 20 }),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { message, history = [], context = null } = req.body;
    const userName = req.user?.name || null;
    try {
      const reply = await aiChat(buildChatSystem(userName, context), history, message);
      res.json({ reply, userName });
    } catch (err) {
      logger.error('Chat error:', err?.message || String(err));
      res.status(500).json({ error: 'المساعد غير متاح حالياً، حاول مرة أخرى.' });
    }
  })
);

// ─── Product Image Generator ──────────────────────────────────────────────────
router.post('/generate-image', auth,
  [
    body('style').optional().isIn(['white', 'lifestyle', 'luxury', 'flat', 'outdoor']),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    if (!geminiAI) return res.status(503).json({ error: 'أضف GEMINI_API_KEY في .env لتفعيل توليد الصور.' });

    const perm = await checkToolPermission(req.user.id, 'image-gen', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.message,
      ...perm,
    });

    const { style = 'white' } = req.body;
    const productName = sanitizeForPrompt(req.body.productName || '', 120);
    const description = sanitizeForPrompt(req.body.description || '', 400);
    const colors = sanitizeForPrompt(req.body.colors || '', 100);
    const purpose = sanitizeForPrompt(req.body.purpose || '', 400); // غرض/سياق التصوير من المستخدم
    const userPrompt = sanitizeForPrompt(req.body.prompt || '', 600); // البرومبت الحر من العميل (الإشارة الأقوى)

    // صورة المنتج المرفوعة (اختيارية) — image-to-image
    let userImg = String(req.body.image || '');
    let userImgMime = String(req.body.imageMimeType || 'image/png');
    if (userImg.startsWith('data:')) {
      const m = userImg.match(/^data:([^;]+);base64,(.*)$/);
      if (m) { userImgMime = m[1]; userImg = m[2]; }
    }
    if (userImg && userImg.length > 11_000_000) {
      return res.status(413).json({ error: 'حجم الصورة كبير جداً — استخدم صورة أصغر (أقل من 8 ميجابايت).' });
    }
    const hasUserImg = userImg.length > 100;

    const styleMap = {
      white:     'pure white seamless background, soft studio lighting, subtle drop shadow, professional product photography',
      lifestyle: 'lifestyle setting, natural environment, shallow depth of field bokeh background, warm natural lighting',
      luxury:    'dark elegant background, dramatic golden rim lighting, subtle sparkle, luxury high-end commercial photography',
      flat:      'flat lay top-down view, clean minimal background, complementary props arranged artfully, overhead shot',
      outdoor:   'outdoor natural setting, golden hour sunlight, beautiful natural background, lifestyle photography',
    };
    const styleDesc = styleMap[style] || styleMap.white;

    // سياق مشترك من مدخلات العميل
    const ctxLines = [
      productName ? `Product: ${productName}.` : '',
      userPrompt  ? `Merchant's request (most important — follow it precisely): ${userPrompt}.` : '',
      purpose     ? `Intended use / where this image will be shown: ${purpose}.` : '',
      description ? `Product details: ${description}.` : '',
      colors      ? `Preferred color scheme: ${colors}.` : '',
    ].filter(Boolean).join('\n');

    // بناء الطلب: صورة مرفوعة → تحسين/إعادة تصميم مع الحفاظ على الهوية. وإلا → توليد جديد.
    const parts = [];
    if (hasUserImg) {
      parts.push({ text:
`You are an expert product photographer and photo retoucher for a Saudi Arabian e-commerce store.
TASK: Enhance and re-design the product shown in the provided photo into a NEW, polished, high-quality commercial image.
CRITICAL RULES:
- Keep the product's EXACT identity: same shape, design, label text, logos and colors as in the photo. Never replace it with a different product.
- Improve lighting, sharpness, composition, background and overall quality to professional commercial grade.
- Apply the merchant's request precisely; infer what they need from their request and intended use.
Target photography style: ${styleDesc}.
${ctxLines}
Output: one ultra-sharp, clean, well-composed, realistic product image ready for an online store listing and social media. No added text, no watermarks, no extra logos.` });
      parts.push({ inlineData: { data: userImg, mimeType: userImgMime } });
    } else {
      parts.push({ text:
`You are an expert product photographer for a Saudi Arabian e-commerce store.
TASK: Generate a NEW, high-quality, photorealistic commercial product image based on the merchant's request below.
Understand exactly what the merchant needs from their request and intended use, and deliver an excellent result.
Target photography style: ${styleDesc}.
${ctxLines || 'Create an attractive professional product photo.'}
Output: one ultra-sharp, clean, well-composed, realistic product image ready for an online store listing and social media. No text, no watermarks.` });
    }

    try {
      const model = geminiAI.getGenerativeModel({
        model: GEMINI_IMAGE_MODEL,
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      });
      const result = await model.generateContent(parts);
      const respParts = result.response.candidates[0].content.parts;
      const imgPart = respParts.find(p => p.inlineData);

      if (!imgPart) throw new Error('لم يتم توليد صورة من النموذج');

      await db.query(
        'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'image-gen', { productName, style, fromImage: hasUserImg, mode: hasUserImg ? 'enhance' : 'generate', purpose: purpose || null, prompt: userPrompt || null }, { generated: true }]
      ).catch(() => {});

      logger.info(`Image generated: ${productName} (${style})${hasUserImg ? ' [image-to-image]' : ''}`);
      res.json({
        image: imgPart.inlineData.data,
        mimeType: imgPart.inlineData.mimeType || 'image/png',
        remaining: perm.remaining,
        used: perm.used,
        limit: perm.limit,
      });
    } catch (err) {
      logger.error('Image gen error:', err.message);
      res.status(500).json({ error: 'حدث خطأ في توليد الصورة. تأكد من مفتاح Gemini وحاول مرة أخرى.' });
    }
  })
);

// ─── WhatsApp Message Templates ──────────────────────────────────────────────
router.post('/whatsapp', auth,
  [
    body('storeName').trim().isLength({ min: 2 }).withMessage('اسم المتجر مطلوب (حرفان على الأقل)'),
    body('productType').trim().isLength({ min: 2 }).withMessage('نوع المنتجات مطلوب (حرفان على الأقل)'),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'whatsapp', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.message,
      ...perm,
    });

    const storeName    = sanitizeForPrompt(req.body.storeName, 100);
    const productType  = sanitizeForPrompt(req.body.productType, 150);
    const tone         = req.body.tone || 'friendly';
    const currentOffer = sanitizeForPrompt(req.body.currentOffer, 200);
    const brandName    = sanitizeForPrompt(req.body.brandName, 100);

    const toneMap = {
      formal:   'رسمي ومهذب، مناسب للمنتجات الفاخرة والمحلات الراقية',
      friendly: 'ودود ودافئ كأصدقاء، مع احترام',
      youthful: 'شبابي وعصري وحيوي',
    };
    const toneDesc = toneMap[tone] || toneMap.friendly;

    const prompt = `أنت متخصص في التسويق عبر واتساب للمتاجر السعودية. مهمتك كتابة رسائل حقيقية ومخصصة — ليست قوالب عامة.

بيانات المتجر:
- الاسم: ${storeName}${brandName ? ` (البراند: ${brandName})` : ''}
- المنتجات: ${productType}
- النبرة: ${toneDesc}${currentOffer ? `\n- العرض الحالي: ${currentOffer}` : ''}

قواعد صارمة:
١. اذكر اسم المتجر "${storeName}" في رسالة واحدة على الأقل من كل تصنيف
٢. اذكر نوع المنتجات "${productType}" أو ما يشابهه في كل تصنيف
٣. لا تبدأ أي رسالة بـ "عميلنا العزيز" أو "مرحباً بكم في متجرنا"
٤. كل رسالة 3-5 أسطر فقط + 2-3 إيموجي مناسبة + CTA واضح في النهاية
٥. الرسائل الثلاثة في كل تصنيف يجب أن تختلف في الأسلوب والصياغة تماماً
٦. إذا كان هناك عرض حالي، ضمّنه في رسائل الترويج والعربة المتروكة${currentOffer ? ': "' + currentOffer + '"' : ''}

مثال على رسالة جيدة (اجعل مثلها لكن لـ ${productType}):
"✨ وصل جديد على ${storeName}!
[منتج جديد من ${productType}] يختلف عن كل اللي جربته من قبل.
محدود — اطلب الآن وشوف الفرق بنفسك 👇 [رابط]"

مثال سيء لا تكتب مثله:
"مرحباً بك في متجرنا! نقدم لك تجربة تسوق فريدة. تواصل معنا لمزيد من المعلومات."

أجب بـ JSON فقط — لا تفسيرات ولا نص خارج الـ JSON — لا تستخدم markdown. ابدأ بـ { مباشرة:
{
"categories": [
  {
    "type": "welcome",
    "title": "الترحيب بعميل جديد",
    "messages": [
      "<رسالة ترحيب دافئة تذكر ${storeName} وتبرز شيئاً مميزاً في ${productType}>",
      "<رسالة ترحيب بزاوية مختلفة: تسلّط الضوء على تجربة الشراء وسهولتها>",
      "<رسالة ترحيب مع هدية أو كود خصم حصري للعميل الجديد>"
    ]
  },
  {
    "type": "promotion",
    "title": "الترويج والعروض",
    "messages": [
      "<رسالة تخلق FOMO حقيقي حول ${productType} مع توقيت محدد>",
      "<رسالة تركز على قيمة ${productType} لا على السعر>${currentOffer ? ' تذكر: ' + currentOffer : ''}",
      "<رسالة عرض محدود الوقت بصياغة خليجية جذابة>"
    ]
  },
  {
    "type": "abandoned_cart",
    "title": "استعادة العربة المتروكة",
    "messages": [
      "<رسالة لطيفة تُذكّر بالعربة دون إلحاح — تستخدم الفضول>",
      "<رسالة تضيف حافزاً إضافياً: شحن مجاني أو خصم>${currentOffer ? ' أو تذكير بـ: ' + currentOffer : ''}",
      "<رسالة أخيرة تخلق urgency حقيقي بمخزون محدود أو انتهاء عرض>"
    ]
  },
  {
    "type": "order_confirm",
    "title": "تأكيد الطلب والشحن",
    "messages": [
      "<رسالة تأكيد دافئة تبني انتظاراً إيجابياً وتذكر اسم المتجر>",
      "<رسالة مع توقعات التوصيل وما سيحدث خطوة بخطوة>",
      "<رسالة إشعار خروج الشحنة مع رابط التتبع>"
    ]
  },
  {
    "type": "review_request",
    "title": "طلب التقييم والرأي",
    "messages": [
      "<رسالة طلب تقييم تشعر العميل بأن رأيه يُغيّر شيئاً فعلاً>",
      "<رسالة تربط التقييم بمكافأة أو كوبون للشراء القادم>",
      "<رسالة قصيرة ومباشرة جداً بصياغة عفوية>"
    ]
  },
  {
    "type": "followup",
    "title": "المتابعة ما بعد الشراء",
    "messages": [
      "<رسالة سؤال عن رضا العميل عن ${productType} بشكل طبيعي غير تسويقي>",
      "<رسالة نصيحة استخدام أو عناية مناسبة لـ ${productType}>",
      "<رسالة تعرض منتجاً مكملاً بأسلوب توصية صديق>"
    ]
  },
  {
    "type": "seasonal",
    "title": "العروض الموسمية والمناسبات",
    "messages": [
      "<رسالة رمضانية تربط ${productType} بروحانية الشهر وهدايا العيد>",
      "<رسالة اليوم الوطني السعودي مع عرض خاص لـ ${storeName}>",
      "<رسالة موسم التخفيضات مع ${productType} كهدية مثالية>"
    ]
  },
  {
    "type": "new_product",
    "title": "إطلاق منتج جديد",
    "messages": [
      "<رسالة تشويق إطلاق تبني فضول حول إضافة جديدة في ${productType}>",
      "<رسالة حصرية للعملاء الأوفياء: وصول مبكر قبل الجميع>",
      "<رسالة مع عرض أوائل الشراء يستمر 24 ساعة فقط>"
    ]
  }
]
}`;

    try {
      const content = await aiGenerateClaude(prompt, 5000);
      await db.query(
        'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'whatsapp', { storeName, productType, tone, currentOffer, brandName }, content]
      ).catch(() => {});
      res.json({ ...content, remaining: perm.remaining, used: perm.used, limit: perm.limit });
    } catch (err) {
      logger.error('WhatsApp templates error:', err.message);
      res.status(500).json({ error: 'حدث خطأ أثناء التوليد. تأكد من مفتاح الذكاء الاصطناعي وحاول مرة أخرى.' });
    }
  })
);

// ─── Competitor Analyzer ──────────────────────────────────────────────────────
router.post('/competitor', auth,
  [
    body('myUrl').isURL({ require_protocol: true }).withMessage('رابط متجرك غير صالح'),
    body('competitorUrl').isURL({ require_protocol: true }).withMessage('رابط متجر المنافس غير صالح'),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'competitor', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.message,
      ...perm,
    });

    const { myUrl, competitorUrl } = req.body;
    const category = sanitizeForPrompt(req.body.category, 100);
    const _e1 = validateStoreUrl(myUrl), _e2 = validateStoreUrl(competitorUrl);
    if (_e1 || _e2) return res.status(400).json({ error: _e1 || _e2 });

    const [mine, comp] = await Promise.all([scrapeStore(myUrl), scrapeStore(competitorUrl)]);

    const describeSite = (url, s) => s.success ? `
- المنصة: ${s.platform}
- SSL: ${s.hasSSL ? 'نعم' : 'لا'}, CDN: ${s.hasCDN ? 'نعم' : 'لا'}
- طرق دفع (${s.paymentMethods.length}): ${s.paymentMethods.join(', ') || 'غير مكتشف'}
- حسابات تواصل (${Object.keys(s.socialLinks).length}): ${Object.keys(s.socialLinks).join(', ') || 'لا'}
- تقنيات (${s.technologies.length}): ${s.technologies.join(', ') || 'لا'}
- H1: ${s.h1s.length}, صور بدون Alt: ${s.imgsMissingAlt}/${s.totalImgs}
- Structured Data: ${s.hasStructuredData ? 'نعم' : 'لا'}, بحث: ${s.hasSearch ? 'نعم' : 'لا'}
- سلة: ${s.hasCart ? 'نعم' : 'لا'}, قائمة جوال: ${s.hasMobileMenu ? 'نعم' : 'لا'}
- سكريبتات: ${s.scriptsCount}, روابط داخلية: ${s.internalLinks}
- إيميل: ${s.contactEmail || 'لا'}, هاتف: ${s.phoneNumbers.join(', ') || 'لا'}`
    : `\n(تعذّر فحص ${url}: ${s.error})`;

    const myDomain = new URL(myUrl).hostname;
    const compDomain = new URL(competitorUrl).hostname;

    const prompt = `أنت خبير تحليل تنافسي لمتاجر إلكترونية سعودية. مهمتك مقارنة موقعين بدقة بناءً على بيانات مُستخرجة فعلاً — لا تخمّن ولا تكرر بيانات المتجرين كما هي.

التخصص: ${category || 'غير محدد'}

=== متجرك: ${myDomain} ===
${describeSite(myUrl, mine)}

=== متجر المنافس: ${compDomain} ===
${describeSite(competitorUrl, comp)}

قواعد التحليل:
١. الدرجات (score و myScore/theirScore) يجب أن تعكس الفرق الحقيقي في البيانات — لا تعطِ نفس الدرجة للمتجرين في نفس المحور
٢. كل analysis في comparison: اذكر الأرقام الفعلية (عدد طرق الدفع، عدد المنصات الاجتماعية، SSL، إلخ)
٣. strengths و weaknesses: كل نقطة تستند إلى بيان محدد من البيانات
٤. opportunities: فرص قابلة للتنفيذ خلال أسبوعين بناءً على نقاط ضعف المنافس الفعلية
٥. strategy: خطوات عملية مرتبة بالأولوية — الأسرع تأثيراً أولاً

أجب بـ JSON فقط — لا تفسيرات ولا نص خارج الـ JSON — لا تستخدم markdown. ابدأ بـ { مباشرة:
{
"summary": "<3-4 جمل: من يتصدر ولماذا بالأرقام + الفجوة الحقيقية بينهما + أكبر فرصة>",
"myStore": {
  "name": "<اسم من الدومين أو العنوان المكتشف>",
  "score": <رقم 0-100 محسوب من البيانات>,
  "strengths": [
    "<قوة 1 مع دليل من البيانات>",
    "<قوة 2>",
    "<قوة 3>",
    "<قوة 4>"
  ],
  "weaknesses": [
    "<ضعف 1 مع تأثيره التنافسي>",
    "<ضعف 2>",
    "<ضعف 3>",
    "<ضعف 4>"
  ]
},
"competitor": {
  "name": "<اسم>",
  "score": <رقم 0-100>,
  "strengths": ["<قوة>", "<قوة 2>", "<قوة 3>", "<قوة 4>"],
  "weaknesses": ["<ضعف>", "<ضعف 2>", "<ضعف 3>", "<ضعف 4>"]
},
"comparison": [
  {"aspect": "تحسين محركات البحث SEO", "myScore": <0-10>, "theirScore": <0-10>, "analysis": "<مقارنة بالأرقام الفعلية: H1, meta, structured data, robots>"},
  {"aspect": "وسائل الدفع", "myScore": <0-10>, "theirScore": <0-10>, "analysis": "<اذكر عدد طرق الدفع لكل متجر من البيانات>"},
  {"aspect": "حضور السوشيال ميديا", "myScore": <0-10>, "theirScore": <0-10>, "analysis": "<اذكر المنصات المكتشفة فعلاً لكل متجر>"},
  {"aspect": "التقنيات والتتبع", "myScore": <0-10>, "theirScore": <0-10>, "analysis": "<عدد التقنيات المكتشفة + CDN + تحليلات>"},
  {"aspect": "تجربة المستخدم", "myScore": <0-10>, "theirScore": <0-10>, "analysis": "<البحث + سلة التسوق + قائمة الجوال + المفضلة>"},
  {"aspect": "الأمان والثقة", "myScore": <0-10>, "theirScore": <0-10>, "analysis": "<SSL + structured data + معلومات التواصل المكتشفة>"},
  {"aspect": "سرعة وأداء الموقع", "myScore": <0-10>, "theirScore": <0-10>, "analysis": "<عدد السكريبتات + CDN + تأثيرها على السرعة>"}
],
"opportunities": [
  "<فرصة 1: نقطة ضعف محددة في المنافس يمكنك استغلالها خلال أسبوع>",
  "<فرصة 2>",
  "<فرصة 3>",
  "<فرصة 4>",
  "<فرصة 5>"
],
"threats": [
  "<تهديد 1: ميزة محددة لدى المنافس يجب أن تردّ عليها>",
  "<تهديد 2>",
  "<تهديد 3>"
],
"strategy": [
  "<خطوة 1: الأسرع تأثيراً — نفّذها هذا الأسبوع>",
  "<خطوة 2>",
  "<خطوة 3>",
  "<خطوة 4>",
  "<خطوة 5: استراتيجية طويلة المدى>"
]
}`;

    try {
      const analysis = await aiGenerateClaude(prompt, 3500);
      await db.query(
        'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'competitor', { myUrl, competitorUrl, category }, analysis]
      ).catch(() => {});
      res.json({
        ...analysis,
        myScraped: mine.success ? { platform: mine.platform, paymentMethods: mine.paymentMethods, socialLinks: mine.socialLinks, technologies: mine.technologies, hasSSL: mine.hasSSL, hasCDN: mine.hasCDN } : null,
        competitorScraped: comp.success ? { platform: comp.platform, paymentMethods: comp.paymentMethods, socialLinks: comp.socialLinks, technologies: comp.technologies, hasSSL: comp.hasSSL, hasCDN: comp.hasCDN } : null,
        remaining: perm.remaining, used: perm.used, limit: perm.limit,
      });
    } catch (err) {
      logger.error('Competitor analyzer error:', err.message);
      res.status(500).json({ error: 'حدث خطأ أثناء التحليل. تأكد من مفتاح الذكاء الاصطناعي وحاول مرة أخرى.' });
    }
  })
);

// ─── Social Media Content Plan ───────────────────────────────────────────────
router.post('/social-plan', auth,
  [
    body('storeName').trim().isLength({ min: 2 }).withMessage('اسم المتجر مطلوب'),
    body('productType').trim().isLength({ min: 2 }).withMessage('نوع المنتجات مطلوب'),
    body('days').isIn(['7', '14', '30']).withMessage('عدد الأيام غير صالح'),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'social-plan', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.message,
      ...perm,
    });

    const storeName     = sanitizeForPrompt(req.body.storeName, 100);
    const productType   = sanitizeForPrompt(req.body.productType, 150);
    const days          = req.body.days;
    const season        = req.body.season || 'normal';
    const targetAudience = sanitizeForPrompt(req.body.targetAudience, 200);
    const tone          = req.body.tone || 'friendly';

    const seasonMap = {
      normal:   'عادي (بدون مناسبة خاصة)',
      ramadan:  'شهر رمضان المبارك',
      eid:      'موسم العيد',
      national: 'اليوم الوطني السعودي',
      sale:     'موسم التخفيضات',
      back:     'العودة للمدارس',
    };
    const toneMap = {
      friendly:     'ودود ودافئ، قريب من العميل',
      professional: 'احترافي ومتخصص',
      youthful:     'شبابي وعصري وحيوي',
      luxury:       'فاخر وراقٍ',
    };

    const postTypes = [
      'ترويجي (عرض أو منتج)',
      'تعليمي (نصيحة أو معلومة)',
      'تفاعلي (سؤال أو استطلاع)',
      'خلف الكواليس (قصة المتجر)',
      'شهادة عميل (تقييم حقيقي)',
      'مقارنة منتجات',
      'before/after أو نتائج',
    ];

    const prompt = `أنت متخصص في إدارة محتوى السوشيال ميديا للمتاجر السعودية. مهمتك إنشاء خطة محتوى ${days} يوماً مدروسة وقابلة للتنفيذ فوراً.

المتجر: ${storeName}
المنتجات: ${productType}
الجمهور: ${targetAudience || 'متسوقون سعوديون'}
الموسم: ${seasonMap[season] || seasonMap.normal}
النبرة: ${toneMap[tone] || toneMap.friendly}

قواعد الخطة:
١. كل يوم له ٣ منشورات: إنستقرام + تيك توك + تويتر X — كل منصة بأسلوبها الخاص
٢. تنوّع أنواع المنشورات بين: ${postTypes.join(' / ')}
٣. لا تكرر نفس نوع المنشور يومين متتاليين على نفس المنصة
٤. المنشورات تذكر "${storeName}" و"${productType}" بشكل طبيعي
٥. كل منشور انستقرام: 3-4 فقرات + إيموجيز + ٥ هاشتاقات عربية + ٣ إنجليزية
٦. كل منشور تيك توك: hook قوي في الجملة الأولى + ٣-٤ نقاط مرئية + CTA
٧. كل تغريدة: أقل من 270 حرف + هاشتاق أو اثنان فقط
٨. أفضل وقت نشر لكل منصة بناءً على جمهور الخليج (مساءً 8-11 ليلاً معظمها)

أجب بـ JSON فقط — لا تفسيرات ولا نص خارج الـ JSON — لا تستخدم markdown. ابدأ بـ { مباشرة:
{
  "storeName": "${storeName}",
  "days": ${days},
  "season": "${seasonMap[season] || seasonMap.normal}",
  "summary": "<جملتان عن استراتيجية الخطة وهدفها>",
  "bestTimes": {
    "instagram": "<أفضل أوقات النشر للسعودية>",
    "tiktok": "<أفضل أوقات>",
    "twitter": "<أفضل أوقات>"
  },
  "plan": [
    {
      "day": 1,
      "theme": "<موضوع اليوم في كلمة أو اثنتين>",
      "instagram": {
        "type": "<نوع المنشور>",
        "caption": "<نص كامل للمنشور>",
        "hashtags": ["#هاشتاق1", "#هاشتاق2", "#هاشتاق3", "#هاشتاق4", "#هاشتاق5", "#english1", "#english2", "#english3"],
        "time": "<أفضل وقت>",
        "tip": "<نصيحة إنتاج: نوع الصورة أو الفيديو المناسب>"
      },
      "tiktok": {
        "type": "<نوع المحتوى>",
        "script": "<hook + النص الكامل مقسم لنقاط>",
        "time": "<أفضل وقت>",
        "tip": "<نصيحة: التأثير أو الصوت المناسب>"
      },
      "twitter": {
        "type": "<نوع التغريدة>",
        "text": "<نص أقل من 270 حرف>",
        "time": "<أفضل وقت>"
      }
    }
  ]
}
أنشئ جميع الـ ${days} يوماً بالكامل بدون اختصار.`;

    const tokenLimit = parseInt(days) >= 30 ? 8192 : parseInt(days) >= 14 ? 6000 : 4000;
    try {
      const content = await aiGenerateClaude(prompt, tokenLimit);
      await db.query(
        'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'social-plan', { storeName, productType, days, season }, { days_count: content.plan?.length }]
      ).catch(() => {});
      res.json({ ...content, remaining: perm.remaining, used: perm.used, limit: perm.limit });
    } catch (err) {
      logger.error('Social plan error:', err.message);
      res.status(500).json({ error: 'حدث خطأ أثناء التوليد. حاول مرة أخرى.' });
    }
  })
);

// ─── Store Policies Generator ─────────────────────────────────────────────────
router.post('/store-policies', auth,
  [
    body('storeName').trim().isLength({ min: 2 }).withMessage('اسم المتجر مطلوب'),
    body('productType').trim().isLength({ min: 2 }).withMessage('نوع المنتجات مطلوب'),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'store-policies', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.message,
      ...perm,
    });

    const storeName    = sanitizeForPrompt(req.body.storeName, 100);
    const productType  = sanitizeForPrompt(req.body.productType, 150);
    const platform     = req.body.platform || 'salla';
    const returnDays   = sanitizeForPrompt(req.body.returnDays || '7', 10);
    const contactEmail = sanitizeForPrompt(req.body.contactEmail || '', 100);
    const contactPhone = sanitizeForPrompt(req.body.contactPhone || '', 30);
    const shippingDays = sanitizeForPrompt(req.body.shippingDays || '3-5', 10);
    const city         = sanitizeForPrompt(req.body.city || 'المملكة العربية السعودية', 100);

    const platformName = platform === 'salla' ? 'سلة' : platform === 'zid' ? 'زد' : sanitizeForPrompt(platform, 30);

    const prompt = `أنت مستشار قانوني متخصص في التجارة الإلكترونية السعودية ومتوافق مع نظام التجارة الإلكترونية ونظام حماية المستهلك في المملكة العربية السعودية.

مهمتك كتابة ٤ سياسات قانونية احترافية لمتجر إلكتروني سعودي — جاهزة للنشر فوراً بدون تعديل.

بيانات المتجر:
- الاسم: ${storeName}
- المنتجات: ${productType}
- المنصة: ${platformName}
- مدة الإرجاع: ${returnDays} أيام
- مدة الشحن: ${shippingDays} أيام عمل
- التغطية الجغرافية: ${city}
${contactEmail ? `- البريد الإلكتروني: ${contactEmail}` : ''}
${contactPhone ? `- رقم التواصل: ${contactPhone}` : ''}

متطلبات كل سياسة:
١. لغة قانونية عربية فصيحة واضحة — بدون تعقيد مفرط
٢. تذكر اسم المتجر "${storeName}" وبياناته الفعلية
٣. تتوافق مع حقوق المستهلك السعودي ونظام التجارة الإلكترونية
٤. كل سياسة لا تقل عن ٤٠٠ كلمة وتغطي جميع الحالات
٥. تنتهي بمعلومات التواصل${contactEmail || contactPhone ? ' الفعلية' : ''}

أجب بـ JSON فقط — لا تفسيرات ولا نص خارج الـ JSON — لا تستخدم markdown. ابدأ بـ { مباشرة:
{
  "storeName": "${storeName}",
  "lastUpdated": "2026",
  "policies": [
    {
      "id": "returns",
      "title": "سياسة الإرجاع والاستبدال",
      "content": "<سياسة إرجاع كاملة ${returnDays} يوم، تغطي: الشروط + الاستثناءات + خطوات الإرجاع + الاسترداد المالي + حالات خاصة لـ ${productType}>"
    },
    {
      "id": "shipping",
      "title": "سياسة الشحن والتوصيل",
      "content": "<سياسة شحن كاملة، تغطي: مناطق التوصيل في ${city} + المدة ${shippingDays} أيام + تكاليف الشحن + التتبع + الحالات الاستثنائية + التأخير>"
    },
    {
      "id": "privacy",
      "title": "سياسة الخصوصية وحماية البيانات",
      "content": "<سياسة خصوصية متوافقة مع الأنظمة السعودية، تغطي: ما نجمعه + كيف نستخدمه + مشاركة البيانات + الحماية + حقوق المستخدم + ملفات الكوكيز>"
    },
    {
      "id": "terms",
      "title": "الشروط والأحكام العامة",
      "content": "<شروط وأحكام كاملة، تغطي: قبول الشروط + حساب المستخدم + الملكية الفكرية + المسؤولية + الدفع والتسعير + التعديلات + القانون المطبق (المملكة العربية السعودية)>"
    }
  ]
}`;

    try {
      const content = await aiGenerateClaude(prompt, 6000);
      await db.query(
        'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'store-policies', { storeName, productType, platform }, { policies_count: content.policies?.length }]
      ).catch(() => {});
      res.json({ ...content, remaining: perm.remaining, used: perm.used, limit: perm.limit });
    } catch (err) {
      logger.error('Store policies error:', err.message);
      res.status(500).json({ error: 'حدث خطأ أثناء التوليد. حاول مرة أخرى.' });
    }
  })
);

// ─── Product Launch Campaign ──────────────────────────────────────────────────
router.post('/launch-campaign', auth,
  [
    body('productName').trim().isLength({ min: 2 }).withMessage('اسم المنتج مطلوب'),
    body('productFeatures').trim().isLength({ min: 10 }).withMessage('مميزات المنتج مطلوبة'),
    body('price').trim().isLength({ min: 1 }).withMessage('السعر مطلوب'),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'launch-campaign', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.message,
      ...perm,
    });

    const productName     = sanitizeForPrompt(req.body.productName, 100);
    const productFeatures = sanitizeForPrompt(req.body.productFeatures, 800);
    const price           = sanitizeForPrompt(req.body.price, 50);
    const storeName       = sanitizeForPrompt(req.body.storeName, 100);
    const targetAudience  = sanitizeForPrompt(req.body.targetAudience, 200) || 'المتسوقون السعوديون';
    const launchDate      = sanitizeForPrompt(req.body.launchDate, 50);
    const budget          = sanitizeForPrompt(req.body.budget, 50);
    const category        = sanitizeForPrompt(req.body.category, 100);

    const prompt = `أنت مدير تسويق محترف متخصص في إطلاق منتجات للمتاجر الإلكترونية السعودية. مهمتك بناء حملة إطلاق متكاملة وقابلة للتنفيذ فوراً.

المنتج: ${productName}
المميزات: ${productFeatures}
السعر: ${price} ريال
${storeName ? `المتجر: ${storeName}` : ''}
${category ? `التصنيف: ${category}` : ''}
الجمهور المستهدف: ${targetAudience}
${launchDate ? `تاريخ الإطلاق: ${launchDate}` : ''}
${budget ? `الميزانية التقريبية: ${budget} ريال` : ''}

الحملة تمتد على ٣ مراحل: قبل الإطلاق (٧ أيام) + يوم الإطلاق + ما بعد الإطلاق (٣ أيام)
كل محتوى يجب أن يذكر "${productName}" بشكل طبيعي ويخاطب "${targetAudience}" مباشرة.

أجب بـ JSON فقط — لا تفسيرات ولا نص خارج الـ JSON — لا تستخدم markdown. ابدأ بـ { مباشرة:
{
  "productName": "${productName}",
  "price": "${price}",
  "campaignHashtag": "<هاشتاق عربي مميز للحملة #>",
  "campaignTheme": "<شعار الحملة: جملة قصيرة تلخص الحملة>",
  "targetInsight": "<جملتان: من هو العميل المثالي ولماذا يحتاج هذا المنتج الآن>",
  "preLaunch": {
    "title": "مرحلة ما قبل الإطلاق (٧ أيام)",
    "goal": "<هدف هذه المرحلة>",
    "days": [
      {
        "day": "اليوم -7",
        "focus": "بناء الترقب",
        "instagram": "<منشور teaser غامض يثير الفضول — لا يكشف المنتج>",
        "tiktok": "<فيديو teaser: 3-4 ثواني بدون صوت + نص>",
        "whatsapp": "<رسالة للعملاء الحاليين: شيء جديد قادم>",
        "tip": "<نصيحة تنفيذية>"
      },
      {
        "day": "اليوم -5",
        "focus": "الكشف الجزئي",
        "instagram": "<منشور يكشف تفصيلة واحدة مثيرة>",
        "tiktok": "<فيديو: behind the scenes لتحضير الإطلاق>",
        "whatsapp": "<رسالة تكشف شيئاً وتدعو للتسجيل مسبقاً>",
        "tip": "<نصيحة>"
      },
      {
        "day": "اليوم -3",
        "focus": "بناء قائمة الانتظار",
        "instagram": "<منشور يعلن عن عرض خاص لأول 50 مشتري>",
        "tiktok": "<فيديو: unboxing جزئي أو لقطات سريعة>",
        "whatsapp": "<رسالة مع رابط Pre-order أو تسجيل>",
        "tip": "<نصيحة>"
      },
      {
        "day": "اليوم -1",
        "focus": "الإعلان الرسمي + العد التنازلي",
        "instagram": "<منشور الكشف الكامل مع مواصفات وسعر>",
        "tiktok": "<فيديو رسمي: عرض المنتج بجودة عالية>",
        "whatsapp": "<رسالة غداً الإطلاق — تذكير مع السعر>",
        "story": "<قصة انستقرام: countdown sticker + سؤال للجمهور>",
        "tip": "<نصيحة>"
      }
    ]
  },
  "launchDay": {
    "title": "يوم الإطلاق",
    "goal": "أقصى مبيعات في 24 ساعة",
    "morning": {
      "time": "8-9 صباحاً",
      "instagram": "<منشور إطلاق رسمي احترافي مع السعر وكود الخصم>",
      "tiktok": "<فيديو إطلاق: أفضل محتوى في الحملة>",
      "whatsapp_blast": "<رسالة للكل: الإطلاق الآن + رابط مباشر>",
      "twitter": "<تغريدة رسمية الإطلاق>"
    },
    "afternoon": {
      "time": "2-3 مساءً",
      "instagram_story": "<قصة: كم وحدة بيعت + urgency>",
      "whatsapp": "<رسالة متابعة: العرض ينتهي الليلة>"
    },
    "evening": {
      "time": "9-10 مساءً",
      "instagram": "<منشور مساء: آخر فرصة لسعر الإطلاق>",
      "whatsapp": "<رسالة الإغلاق: ساعات قليلة>"
    },
    "adCopy": {
      "meta": "<إعلان Meta/Instagram: 3 جمل مؤثرة + CTA>",
      "snapchat": "<إعلان سناب: نص قصير مباشر جداً>",
      "tiktok_ad": "<نص إعلان تيك توك: hook + فائدة + CTA>"
    }
  },
  "postLaunch": {
    "title": "ما بعد الإطلاق (٣ أيام)",
    "days": [
      {
        "day": "اليوم +1",
        "focus": "الزخم والشهادات",
        "instagram": "<منشور: شكر المشترين + عرض تقييم أول>",
        "whatsapp": "<رسالة للمشترين: تأكيد الطلب + توقعات الشحن>",
        "tip": "<اجمع screenshots للطلبات وانشرها كـ social proof>"
      },
      {
        "day": "اليوم +2",
        "focus": "UGC وشهادات حقيقية",
        "instagram": "<منشور: شارك تجربتك + هاشتاق الحملة>",
        "whatsapp": "<رسالة: طلب صورة أو تقييم مع حافز>",
        "tip": "<ردّ على كل تعليق وشارك محتوى العملاء>"
      },
      {
        "day": "اليوم +3",
        "focus": "إغلاق عرض الإطلاق",
        "instagram": "<منشور: آخر 24 ساعة بسعر الإطلاق>",
        "whatsapp": "<رسالة نهائية: العرض ينتهي اليوم>",
        "tip": "<حلّل النتائج: أفضل منصة + أفضل محتوى>"
      }
    ]
  },
  "emailCampaign": {
    "subject": "<عنوان البريد ليوم الإطلاق: أقل من 55 حرف>",
    "preview": "<نص المعاينة: 90 حرف>",
    "body": "<نص بريد إلكتروني كامل للإطلاق: 3-4 فقرات + CTA>"
  },
  "kpis": [
    "<مؤشر أداء 1: هدف رقمي واضح>",
    "<مؤشر 2>",
    "<مؤشر 3>",
    "<مؤشر 4>"
  ],
  "tips": [
    "<نصيحة تنفيذية مهمة جداً 1>",
    "<نصيحة 2>",
    "<نصيحة 3>"
  ]
}`;

    try {
      const content = await aiGenerateClaude(prompt, 8000);
      await db.query(
        'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'launch-campaign', { productName, price, targetAudience }, { has_prelaunch: !!content.preLaunch }]
      ).catch(() => {});
      res.json({ ...content, remaining: perm.remaining, used: perm.used, limit: perm.limit });
    } catch (err) {
      logger.error('Launch campaign error:', err.message);
      res.status(500).json({ error: 'حدث خطأ أثناء التوليد. حاول مرة أخرى.' });
    }
  })
);

// ─── Store Analyzer v5 — Decision Advisor ─────────────────────────────────────
router.post('/analyze-v5', auth,
  [body('storeUrl').isURL({ require_protocol: true }).withMessage('رابط المتجر غير صالح')],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'analyzer', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.message,
      ...perm,
    });

    const { storeUrl } = req.body;
    const category = sanitizeForPrompt(req.body.category, 100);
    const urlErr = validateStoreUrl(storeUrl);
    if (urlErr) return res.status(400).json({ error: urlErr });

    // تحليل جديد دائماً (لا نُرجِع نتيجة مخزّنة) — التخزين يبقى لتصدير PDF فقط
    const cacheKey = 'v5:' + storeUrl.toLowerCase().trim() + '|' + (category || '');

    const url = new URL(storeUrl);

    // Layer 1: Data collectors — Puppeteer is the primary scraping source
    const _cols = await Promise.allSettled([
      fetchSEOFiles(storeUrl),
      fetchPageSpeed(storeUrl),
      takeStoreScreenshots(storeUrl), // Returns screenshots + renderedHtml
      checkSecurityHeaders(storeUrl),
    ]);
    const [seoFiles, pageSpeed, screenshots, security] = _cols.map(
      (r) => r.status === 'fulfilled' ? r.value : { success: false }
    );
    let scraped = { success: false };
    if (screenshots.success && screenshots.renderedHtml) {
      try { scraped = await scrapeStore(storeUrl, screenshots.renderedHtml); } catch(e) {}
    }
    if (!scraped.success) {
      try { scraped = await scrapeStore(storeUrl); } catch(e) { scraped = { success: false }; }
    }

    const platform = scraped.success ? scraped.platform
      : (url.hostname.includes('salla') ? 'سلة' : url.hostname.includes('zid') ? 'زد' : 'غير محدد');
    const storeName = (scraped.success && scraped.pageTitle) ? scraped.pageTitle : url.hostname.split('.')[0];

    // Layer 2 + v5 analysis
    const v5Data = await runV5Analysis({
      scraped, seoFiles, pageSpeed, screenshots, security,
      userId: req.user.id, storeUrl, category,
    });

    // Layer 3: 3 AI calls (core + visual + actions)
    const safe = (fn, name) => fn.catch(e => { logger.warn(`v5 ${name}: ${e.message?.slice(0,80)}`); return null; });
    const benchmark = getIndustryBenchmark(category);
    const [core, visual] = await Promise.all([
      safe(aiCallCore(scraped, seoFiles, pageSpeed, security, category, benchmark, storeUrl, platform, storeName), 'aiCallCore'),
      safe(aiCallVisual(screenshots, scraped, storeUrl), 'aiCallVisual'),
    ]);

    const coreScore = core?.overallScore || 60;
    const trustScore = computeTrustScore(scraped.success ? scraped : {}, seoFiles);

    await db.query(
      'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
      [req.user.id, 'analyzer', { storeUrl, category, version: 'v5' }, { score: coreScore }]
    ).catch(() => {});

    const _result = {
      version: 'v5',
      overallScore: coreScore,
      platform: core?.platform || platform,
      storeName: core?.storeName || storeName,
      summary: core?.summary,
      criteria: core?.criteria || [],
      trustScore,
      seo: core?.seo,
      ux: core?.ux,
      visualAudit: visual?.items || [],
      visualScore: visual?.visualScore || 0,
      visionUsed: visual?.visionUsed || false,
      pageSpeedUsed: pageSpeed.success,
      detectedIndustry: scraped.success ? (scraped.detectedIndustry || category || null) : (category || null),
      ...v5Data,
    };

    if (coreScore !== 60 || (_result.criteria || []).length > 0) await setCached(cacheKey, 'v5', _result);
    saveSnapshot(req.user.id, storeUrl, _result).catch(() => {});

    res.json({ ..._result, remaining: perm.remaining, used: perm.used, limit: perm.limit });
  })
);

// ─── Action Status (v5) ──────────────────────────────────────────────────────
router.post('/action-status', auth,
  [
    body('storeUrl').isURL({ require_protocol: true }).withMessage('رابط المتجر غير صالح'),
    body('issueId').trim().notEmpty().withMessage('معرف المشكلة مطلوب'),
    body('status').isIn(['suggested','in_progress','done','dismissed']).withMessage('حالة غير صالحة'),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { storeUrl, issueId, issueTitle, status, monthlyLossSaved } = req.body;
    await upsertAction(req.user.id, storeUrl, issueId, issueTitle || issueId, status, monthlyLossSaved || 0);
    res.json({ ok: true });
  })
);

// ─── Export PDF — Puppeteer-based server-side PDF generation ─────────────────
router.post('/export-pdf', auth, ar(async (req, res) => {
  const { storeUrl, category, data } = req.body;
  if (!storeUrl) return res.status(400).json({ error: 'storeUrl مطلوب' });

  // Use data sent directly from frontend (preferred) OR fall back to cache
  const reportData = data || await getCached(storeUrl, category || '');
  if (!reportData) return res.status(404).json({ error: 'لا يوجد تقرير — حلّل المتجر أولاً ثم اطلب PDF.' });

  const html = buildPdfHtml(reportData, storeUrl);

  let browser;
  try {
    browser = await (require('puppeteer-core')).launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--disable-dev-shm-usage'],
      timeout: 30000,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 800)); // Let inline styles render
    const pdfRaw = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
    });
    await browser.close();

    // Ensure we have a proper Node.js Buffer (Puppeteer may return Uint8Array)
    const pdfBuf = Buffer.isBuffer(pdfRaw) ? pdfRaw : Buffer.from(pdfRaw);

    const storeName = (reportData.storeName || new URL(storeUrl).hostname)
      .replace(/[^a-zA-Z؀-ۿ0-9]/g, '-').slice(0, 30);
    const filename  = `تقرير-${storeName}-${new Date().toISOString().slice(0,10)}.pdf`;

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': pdfBuf.length,
    });
    res.end(pdfBuf);
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    logger.error('PDF export error:', err.message);
    res.status(500).json({ error: 'فشل توليد PDF: ' + err.message.slice(0, 100) });
  }
}));

/* ── HTML Template for PDF ──────────────────────────────────────────────────── */
function buildPdfHtml(r, storeUrl) {
  const sar = n => n ? Number(n).toLocaleString('ar-SA') + ' ريال' : null;
  const scoreColor = s => s >= 75 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';
  const pBar = (s, color) => `<div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden;flex:1;">
    <div style="height:100%;width:${s}%;background:${color};border-radius:4px;"></div></div>`;

  const ALL_PAY = ['مدى','Apple Pay','STC Pay','تابي','تمارا','فيزا','ماستركارد','الدفع عند الاستلام'];
  const sc  = r.scraped || {};
  const have = sc.paymentMethods || [];
  const miss = ALL_PAY.filter(p => !have.includes(p));

  const criteria = (r.criteria || []).map(c => `
    <tr>
      <td style="padding:5px 8px;font-size:9pt;color:#374151;width:160px;">${c.name}</td>
      <td style="padding:5px 8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          ${pBar(c.score, scoreColor(c.score))}
          <span style="font-size:9pt;font-weight:700;color:${scoreColor(c.score)};width:28px;text-align:center;">${c.score}</span>
        </div>
      </td>
      <td style="padding:5px 8px;font-size:8pt;color:#6b7280;max-width:220px;">${(c.feedback||'').slice(0,120)}</td>
    </tr>`).join('');

  const actions = [...(r.patternIssues||[]).filter(i=>i.actionStatus!=='done').sort((a,b)=>(b.estimatedMonthly||0)-(a.estimatedMonthly||0)).slice(0,6),
                   ...(r.actions||[]).slice(0,4)].slice(0,8).map((a,i) => {
    const title = a.title || a.task || '';
    const desc  = (a.desc || a.reason || '').slice(0, 150);
    const money = a.estimatedMonthly ? sar(a.estimatedMonthly)+'/شهر' : a.estimatedRevenue ? sar(a.estimatedRevenue) : '';
    const pri   = a.priority === 'high' ? '#dc2626' : a.priority === 'medium' ? '#d97706' : '#6366f1';
    return `<tr style="background:${i%2===0?'#fafafa':'white'};">
      <td style="padding:5px 8px;font-size:9pt;font-weight:600;">${title}</td>
      <td style="padding:5px 8px;font-size:8pt;color:#6b7280;">${desc}</td>
      <td style="padding:5px 8px;text-align:center;">
        <span style="background:${pri}20;color:${pri};border-radius:99px;padding:2px 8px;font-size:8pt;font-weight:700;white-space:nowrap;">
          ${a.priority==='high'?'عاجل':a.priority==='medium'?'مهم':'تحسين'}
        </span>
      </td>
      <td style="padding:5px 8px;font-size:8.5pt;color:#16a34a;font-weight:600;white-space:nowrap;">${money||''}</td>
    </tr>`;
  }).join('');

  const comps = (r.psychology?.competitors || r.competitors || []).slice(0,3).map(c => `
    <div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px;flex:1;min-width:140px;">
      <div style="font-weight:700;font-size:9.5pt;color:#1f2937;margin-bottom:4px;">${c.arabicName||c.name||''}</div>
      <div style="font-size:8pt;color:#6366f1;margin-bottom:6px;word-break:break-all;">${c.url||''}</div>
      ${c.strength?`<div style="font-size:8pt;color:#374151;"><span style="color:#6b7280;">قوة: </span>${c.strength}</div>`:''}
      ${c.differentiator?`<div style="font-size:8pt;color:#374151;margin-top:3px;"><span style="color:#6b7280;">ميزتك: </span>${c.differentiator}</div>`:''}
    </div>`).join('');

  const qw = (r.quickWins||[]).map(w=>`<li style="padding:4px 0;font-size:9pt;color:#374151;">${w}</li>`).join('');

  const date = new Date().toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' });
  const score = r.overallScore || 0;
  const sc2 = scoreColor(score);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI','Arial',sans-serif; color:#1f2937; background:white; font-size:10pt; direction:rtl; }
  h2 { font-size:11pt; font-weight:800; color:#1f2937; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
  h2::before { content:''; display:inline-block; width:4px; height:16px; background:#6366f1; border-radius:2px; }
  .section { margin-bottom:16px; padding:14px 16px; border:1px solid #e5e7eb; border-radius:8px; background:white; page-break-inside:avoid; }
  table { width:100%; border-collapse:collapse; }
  th { background:#f3f4f6; font-size:8.5pt; font-weight:700; color:#374151; padding:6px 8px; text-align:right; }
  .chip { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:99px; font-size:8pt; font-weight:600; margin:2px; }
  .chip-ok  { background:#dcfce7; color:#166534; border:1px solid #86efac; }
  .chip-no  { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; opacity:.8; }
  .chip-tag { background:#ede9fe; color:#5b21b6; border:1px solid #c4b5fd; }
</style>
</head>
<body>
<!-- ── HEADER ── -->
<div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:18px 20px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:7.5pt;opacity:.8;margin-bottom:2px;">تقرير تحليل المتجر الذكي — أدوات التاجر</div>
    <div style="font-size:15pt;font-weight:800;">${r.storeName || new URL(storeUrl).hostname}</div>
    <div style="font-size:8.5pt;opacity:.85;margin-top:3px;">${storeUrl}</div>
  </div>
  <div style="text-align:left;">
    <div style="font-size:36pt;font-weight:900;line-height:1;">${score}</div>
    <div style="font-size:8pt;opacity:.8;">/ 100 — التقييم الكلي</div>
    <div style="font-size:7.5pt;opacity:.7;margin-top:4px;">${date}</div>
  </div>
</div>

<!-- ── STORE IDENTITY ── -->
<div class="section">
  <h2>معلومات المتجر</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
    <div>
      <div style="font-size:8pt;color:#6b7280;margin-bottom:4px;font-weight:600;">المنصة والثيم</div>
      <div style="font-size:10pt;font-weight:700;">${r.platform||sc.platform||'—'}</div>
      ${(r.themeName||sc.themeName)?`<div style="font-size:8.5pt;color:#6366f1;">ثيم: ${r.themeName||sc.themeName}</div>`:''}
    </div>
    <div>
      <div style="font-size:8pt;color:#6b7280;margin-bottom:4px;font-weight:600;">التواصل</div>
      ${sc.contactEmail?`<div style="font-size:8.5pt;">البريد: ${sc.contactEmail}</div>`:''}
      ${(sc.phoneNumbers||[]).map(p=>`<div style="font-size:8.5pt;">هاتف: ${p}</div>`).join('')}
    </div>
    <div>
      <div style="font-size:8pt;color:#6b7280;margin-bottom:4px;font-weight:600;">الدرجات الفرعية</div>
      ${[['الثقة',r.trustScore],['CRO',r.cro?.score],['الصحة',r.healthScore]].filter(([,v])=>v!=null).map(([l,v])=>
        `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;font-size:8.5pt;">
          <span style="width:50px;color:#6b7280;">${l}</span>
          <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
            <div style="width:${v}%;height:100%;background:${scoreColor(v)};"></div>
          </div>
          <span style="font-weight:700;color:${scoreColor(v)};">${Math.round(v)}</span>
        </div>`).join('')}
    </div>
  </div>

  ${have.length||miss.length?`
  <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;">
    <div style="font-size:8pt;color:#6b7280;margin-bottom:5px;font-weight:600;">طرق الدفع</div>
    ${have.map(p=>`<span class="chip chip-ok">✓ ${p}</span>`).join('')}
    ${miss.slice(0,4).map(p=>`<span class="chip chip-no">✗ ${p}</span>`).join('')}
  </div>`:''}

  ${Object.keys(sc.socialLinks||{}).length?`
  <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
    <div style="font-size:8pt;color:#6b7280;margin-bottom:5px;font-weight:600;">وسائل التواصل</div>
    ${Object.keys(sc.socialLinks||{}).map(s=>`<span class="chip chip-tag">${s}</span>`).join('')}
  </div>`:''}

  ${(sc.technologies||[]).length?`
  <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
    <div style="font-size:8pt;color:#6b7280;margin-bottom:5px;font-weight:600;">التقنيات</div>
    ${(sc.technologies||[]).slice(0,12).map(t=>`<span class="chip chip-tag">${t}</span>`).join('')}
  </div>`:''}
</div>

${r.totalMonthlyLoss?`
<!-- ── REVENUE BANNER ── -->
<div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:8px;padding:14px 16px;margin-bottom:16px;border-top:3px solid #dc2626;">
  <h2 style="color:#dc2626;">خسارة إيرادات تقديرية بسبب المشاكل المكتشفة</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:8px;">
    <div style="text-align:center;background:white;border-radius:6px;padding:10px;border:1px solid #fca5a5;">
      <div style="font-size:16pt;font-weight:800;color:#dc2626;">${sar(r.totalMonthlyLoss)}</div>
      <div style="font-size:8pt;color:#6b7280;">خسارة / شهر</div>
    </div>
    <div style="text-align:center;background:white;border-radius:6px;padding:10px;border:1px solid #fca5a5;">
      <div style="font-size:16pt;font-weight:800;color:#dc2626;">${sar(r.totalYearlyLoss)}</div>
      <div style="font-size:8pt;color:#6b7280;">خسارة / سنة</div>
    </div>
    <div style="text-align:center;background:white;border-radius:6px;padding:10px;border:1px solid #e5e7eb;">
      <div style="font-size:16pt;font-weight:800;color:#6366f1;">${(r.estimatedVisitors||0).toLocaleString('ar-SA')}</div>
      <div style="font-size:8pt;color:#6b7280;">زائر / شهر</div>
    </div>
  </div>
</div>`:''}

<!-- ── SUMMARY ── -->
${r.summary?`
<div class="section">
  <h2>ملخص التحليل</h2>
  <p style="font-size:9.5pt;line-height:1.8;color:#374151;">${r.summary}</p>
  ${(r.strengths||[]).length||( r.weaknesses||[]).length?`
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:10px;">
      <div style="font-weight:700;color:#166534;font-size:9pt;margin-bottom:6px;">✓ نقاط القوة</div>
      ${(r.strengths||[]).map(s=>`<div style="font-size:8.5pt;color:#374151;padding:2px 0;">• ${s}</div>`).join('')}
    </div>
    <div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:6px;padding:10px;">
      <div style="font-weight:700;color:#991b1b;font-size:9pt;margin-bottom:6px;">✗ نقاط الضعف</div>
      ${(r.weaknesses||[]).map(w=>`<div style="font-size:8.5pt;color:#374151;padding:2px 0;">• ${w}</div>`).join('')}
    </div>
  </div>`:''}
</div>`:''}

<!-- ── CRITERIA ── -->
${criteria?`
<div class="section">
  <h2>تقييم الأداء — 15 معياراً</h2>
  <table>
    <thead><tr><th>المعيار</th><th>الدرجة</th><th>التغذية الراجعة</th></tr></thead>
    <tbody>${criteria}</tbody>
  </table>
</div>`:''}

<!-- ── QUICK WINS ── -->
${qw?`
<div class="section" style="background:#f0fdf4;border-color:#86efac;">
  <h2 style="color:#166534;">⚡ إصلاحات سريعة — نفّذها اليوم</h2>
  <ul style="padding-right:16px;margin-top:6px;">${qw}</ul>
</div>`:''}

<!-- ── ACTIONS ── -->
${actions?`
<div class="section">
  <h2>التوصيات المفصّلة — مرتّبة حسب الأثر المالي</h2>
  <table>
    <thead><tr><th>التوصية</th><th>التفاصيل</th><th>الأولوية</th><th>الأثر المالي</th></tr></thead>
    <tbody>${actions}</tbody>
  </table>
</div>`:''}

<!-- ── COMPETITORS ── -->
${comps?`
<div class="section">
  <h2>تحليل المنافسين في نفس المجال</h2>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">${comps}</div>
</div>`:''}

<!-- ── FOOTER ── -->
<div style="margin-top:20px;padding-top:10px;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between;font-size:7.5pt;color:#9ca3af;">
  <span>أدوات التاجر — adwat-altajer.com</span>
  <span>تم التوليد بالذكاء الاصطناعي — ${date}</span>
</div>
</body></html>`;
}

// ─── Store History (v5) ───────────────────────────────────────────────────────
router.get('/store-history', auth, ar(async (req, res) => {
  const storeUrl = req.query.url;
  if (!storeUrl) return res.status(400).json({ error: 'url مطلوب' });
  const [snapshots, actions] = await Promise.all([
    db.query(
      `SELECT id,overall_score,estimated_monthly_loss,estimated_visitors,store_industry,created_at
       FROM store_snapshots WHERE user_id=$1 AND store_url=$2 ORDER BY created_at DESC LIMIT 10`,
      [req.user.id, storeUrl]
    ).then(r => r.rows).catch(() => []),
    getActions(req.user.id, storeUrl),
  ]);
  const comparison = snapshots.length >= 2 ? {
    scoreDelta: (snapshots[0].overall_score || 0) - (snapshots[1].overall_score || 0),
    lossDelta:  (snapshots[0].estimated_monthly_loss || 0) - (snapshots[1].estimated_monthly_loss || 0),
    daysBetween: Math.round((new Date(snapshots[0].created_at) - new Date(snapshots[1].created_at)) / 86400000),
  } : null;
  res.json({ snapshots, comparison, actions });
}));

// ─── My Access Requests ───────────────────────────────────────────────────────
router.get('/my-requests', auth, ar(async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, tool_name, reason, status, admin_note, created_at FROM tool_access_requests WHERE user_id=$1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
}));

// ─── Tool History ─────────────────────────────────────────────────────────────
router.get('/history', auth, ar(async (req, res) => {
  const { rows } = await db.query(
    'SELECT id,tool_name,input_data,created_at FROM tool_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 60',
    [req.user.id]
  );
  res.json(rows);
}));

// إحصائيات التاجر — ملخّص استخدامه + تطوّر تقييم متجره
router.get('/my-stats', auth, ar(async (req, res) => {
  const uid = req.user.id;
  const [total, perTool, last7, scores] = await Promise.all([
    db.query('SELECT COUNT(*)::int AS c FROM tool_logs WHERE user_id=$1', [uid]),
    db.query('SELECT tool_name, COUNT(*)::int AS c FROM tool_logs WHERE user_id=$1 GROUP BY tool_name ORDER BY c DESC', [uid]),
    db.query(`SELECT COUNT(*)::int AS c FROM tool_logs WHERE user_id=$1 AND created_at > NOW() - INTERVAL '7 days'`, [uid]),
    db.query(`SELECT score, store_name, created_at FROM analysis_submissions WHERE user_id=$1 AND score IS NOT NULL ORDER BY created_at ASC LIMIT 20`, [uid]),
  ]);
  res.json({
    totalRuns: total.rows[0].c,
    last7Days: last7.rows[0].c,
    perTool: perTool.rows,
    scoreTrend: scores.rows,
  });
}));

// جلب نتيجة عملية واحدة كاملة (لصفحة «نتائجي»)
router.get('/history/:id', auth, ar(async (req, res) => {
  const { rows } = await db.query(
    'SELECT id,tool_name,input_data,result_data,created_at FROM tool_logs WHERE id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'غير موجود' });
  res.json(rows[0]);
}));

// ─── مسار التاجر (Merchant Path) ──────────────────────────────────────────────
// خطوات الخطة حسب مفتاح النقص — تُستخدم لبناء خطة تأسيس/تطوير
const MP_STEPS = {
  legal:            { title: 'وثّق وضعك النظامي', desc: 'أصدر وثيقة العمل الحر أو السجل التجاري — أساس لفتح حساب بنكي تجاري وتوثيق المتجر.' },
  payment:          { title: 'فعّل وسائل الدفع', desc: 'أضف مدى وApple Pay والتقسيط (تابي/تمارا) — كل وسيلة ناقصة تخسّرك مبيعات.' },
  domain:           { title: 'احجز دومين خاص', desc: 'اربط نطاقاً باسم متجرك بدل الرابط الفرعي — يرفع الثقة والظهور.' },
  design_ux:        { title: 'حسّن تصميم الواجهة', desc: 'هوية وبنرات وتصنيفات واضحة وتجربة استخدام سلسة ترفع التحويل.' },
  products_content:  { title: 'جهّز المنتجات', desc: 'صور احترافية + أوصاف كاملة + تصنيفات منظّمة لكل منتج.' },
  seo:              { title: 'حسّن الظهور في البحث (SEO)', desc: 'كلمات مفتاحية وأوصاف محسّنة ليجدك العملاء على قوقل.' },
  shipping:         { title: 'اضبط الشحن والتوصيل', desc: 'فعّل شركات الشحن وخيارات التوصيل وسياسة واضحة.' },
  analytics:        { title: 'فعّل التتبع والتحليلات', desc: 'اربط Google Analytics والبيكسلات لتقيس أداء متجرك وحملاتك.' },
  marketing_social: { title: 'ابنِ التسويق والسوشيال', desc: 'حسابات تواصل فعّالة وحملات إعلانية تجذب جمهورك المستهدف.' },
  customer_service: { title: 'حسّن خدمة العملاء', desc: 'واتساب وردود سريعة وإشعارات تلقائية ترفع رضا العملاء وتكرارهم.' },
  audit:            { title: 'احصل على تقييم شامل', desc: 'استشارة أو تحليل كامل للمتجر يحدّد أولوياتك بدقة.' },
  new_store:        { title: 'أسّس متجرك بالكامل', desc: 'باقة تأسيس متكاملة: إنشاء وتصميم وربط وتجهيز جاهز للبيع.' },
};

const MP_KEY_LABEL = {
  legal: 'الوضع النظامي', payment: 'وسائل الدفع', domain: 'الدومين', design_ux: 'تصميم الواجهة',
  products_content: 'المنتجات', seo: 'الظهور في البحث', shipping: 'الشحن', analytics: 'التحليلات',
  marketing_social: 'التسويق', customer_service: 'خدمة العملاء', audit: 'التقييم الشامل', new_store: 'التأسيس',
};

router.post('/merchant-path', auth,
  [
    body('mode').isIn(['beginner', 'current']).withMessage('وضع غير صالح'),
    body('gapKeys').optional().isArray({ max: 20 }),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'merchant-path', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({ error: perm.message, ...perm });

    const mode = req.body.mode;
    const validKeys = Object.keys(MP_STEPS);
    const gapKeys = [...new Set((Array.isArray(req.body.gapKeys) ? req.body.gapKeys : [])
      .filter(k => validKeys.includes(k)))];
    const readinessScore = mode === 'current' ? Math.max(0, Math.min(100, parseInt(req.body.readinessScore) || 0)) : null;
    const performanceHealth = mode === 'current' && req.body.performanceHealth != null
      ? Math.max(0, Math.min(100, parseInt(req.body.performanceHealth))) : null;
    const strengths = (Array.isArray(req.body.strengths) ? req.body.strengths : [])
      .slice(0, 12).map(s => sanitizeForPrompt(s, 90)).filter(Boolean);
    const weaknesses = (Array.isArray(req.body.weaknesses) ? req.body.weaknesses : [])
      .slice(0, 12).map(s => sanitizeForPrompt(s, 90)).filter(Boolean);
    // تفاصيل اختيارات التاجر (سؤال/إجابة) — لعرضها للأدمن
    const details = (Array.isArray(req.body.details) ? req.body.details : [])
      .slice(0, 60)
      .map(d => ({ q: sanitizeForPrompt(d?.q, 140), a: sanitizeForPrompt(d?.a, 200) }))
      .filter(d => d.q && d.a);
    const contact = sanitizeForPrompt(req.body.contact, 60);

    // الخدمات المرشّحة من الكتالوج حسب نقاط النقص
    let recommendedServices = [];
    try { recommendedServices = servicesCatalog.recommendByKeys(gapKeys, 5); }
    catch (e) { logger.warn(`merchant-path recommend failed: ${e.message?.slice(0,60)}`); }

    // خطة عملية مرتّبة حسب النقص (للمبتدئ: تأسيس، للحالي: تطوير)
    const plan = gapKeys.map((k, i) => ({ step: i + 1, key: k, ...MP_STEPS[k] }));
    const readinessLabel = readinessScore == null ? null
      : readinessScore >= 80 ? 'متجر جاهز' : readinessScore >= 55 ? 'يحتاج تحسينات' : 'يحتاج تأسيس';

    await db.query(
      'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
      [req.user.id, 'merchant-path', { mode, readinessScore, performanceHealth, gaps: gapKeys.length },
       { readinessScore, performanceHealth, recommended: recommendedServices.length }]
    ).catch(() => {});

    // حفظ الطلب ليصل للأدمن بكل التفاصيل
    await db.query(
      `INSERT INTO merchant_path_submissions
       (user_id, mode, readiness_score, performance_health, readiness_label, contact, details, gaps, recommended)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [req.user.id, mode, readinessScore, performanceHealth, readinessLabel, contact || null,
       JSON.stringify(details),
       JSON.stringify(gapKeys.map(k => ({ key: k, label: MP_KEY_LABEL[k] || k }))),
       JSON.stringify(recommendedServices.map(s => ({ name: s.name, price: s.price, currency: s.currency, url: s.url })))]
    ).catch(e => logger.warn(`merchant-path save failed: ${e.message?.slice(0,80)}`));

    logger.info(`merchant-path: ${mode} — readiness:${readinessScore ?? '-'} perf:${performanceHealth ?? '-'} gaps:${gapKeys.length} recs:${recommendedServices.length}`);

    // خطة ذكية مخصّصة بالـ AI حسب إجابات التاجر الفعلية (مع fallback للخطة الجاهزة)
    let aiPlan = null;
    try {
      const detailsTxt = details.map(d => `- ${d.q}: ${d.a}`).join('\n').slice(0, 2500);
      const recsTxt = recommendedServices.map(s => s.name).join('، ') || 'لا يوجد';
      const ctx = mode === 'current'
        ? `تاجر لديه متجر. جاهزية المتجر: ${readinessScore}/100 (${readinessLabel}). صحة الأداء: ${performanceHealth ?? 'غير متاح'}%.`
        : `شخص مبتدئ يريد تأسيس متجر إلكتروني.`;
      const aiPrompt = `أنت مستشار تجارة إلكترونية سعودي خبير. حلّل حالة هذا التاجر بعمق بناءً على إجاباته الفعلية، واكتب له **خطة شاملة من الألف إلى الياء، مرتّبة ومرقّمة** تغطي كل ما يحتاجه — بنبرة بشرية محفّزة (سعودي فصيح مبسّط، ليس روبوتياً).

${ctx}
نقاط الضعف المكتشفة: ${weaknesses.join('، ') || 'لا يوجد'}
الخدمات المتاحة لمساعدته: ${recsTxt}

إجابات التاجر:
${detailsTxt}

أعد JSON بهذا الشكل بالضبط:
{
  "summary": "تحليل واضح (4-5 جمل) لوضعه الحالي: أين يقف، أهم نقطة قوة يبني عليها، أخطر نقطة ضعف يجب معالجتها فوراً، وما النتيجة المتوقّعة لو طبّق الخطة.",
  "phases": [
    {"title":"عنوان المرحلة (مثل: التأسيس / الهوية والثقة / المنتجات / التسويق / التشغيل والنمو)","steps":[{"title":"خطوة محددة","desc":"شرح عملي مفصّل: ماذا يفعل بالضبط وكيف يبدأ والناتج المتوقّع","impact":"الأثر المتوقّع بجملة قصيرة"}]}
  ],
  "tips": ["نصيحة ذكية عملية", "نصيحة ثانية", "نصيحة ثالثة", "نصيحة رابعة"]
}
قواعد صارمة:
- قسّم الخطة إلى 3-5 مراحل منطقية مرتّبة زمنياً (من الأهم/الأساس إلى النمو)، وكل مرحلة فيها 2-4 خطوات عملية.
- المجموع الكلي 8-14 خطوة تغطي رحلته كاملة (تأسيس/قانوني، هوية وثقة، منتجات وتصوير، طرق دفع وشحن، SEO ومحتوى، تسويق وإعلانات، خدمة عملاء، تحليلات ونمو) — بما يناسب حالته فقط.
- اربط كل خطوة بإجاباته تحديداً وتجنّب العموميات. لا تذكر أسعاراً.`;
      const r = await aiGenerate(aiPrompt, 4500);
      if (r && (r.summary || Array.isArray(r.phases) || Array.isArray(r.steps))) {
        // فكّ المراحل إلى خطوات مرقّمة متتابعة (مع الإبقاء على عنوان المرحلة في الخطوة الأولى)
        let steps = [];
        if (Array.isArray(r.phases) && r.phases.length) {
          r.phases.slice(0, 6).forEach(ph => {
            const phTitle = sanitizeForPrompt(ph?.title, 80);
            (Array.isArray(ph?.steps) ? ph.steps : []).slice(0, 6).forEach((s, idx) => {
              const title = sanitizeForPrompt(s?.title, 140);
              if (title) steps.push({ phase: idx === 0 ? phTitle : '', title, desc: sanitizeForPrompt(s?.desc, 500), impact: sanitizeForPrompt(s?.impact, 160) });
            });
          });
        } else {
          steps = (Array.isArray(r.steps) ? r.steps : []).slice(0, 14)
            .map(s => ({ title: sanitizeForPrompt(s?.title, 140), desc: sanitizeForPrompt(s?.desc, 500), impact: sanitizeForPrompt(s?.impact, 160) }))
            .filter(s => s.title);
        }
        aiPlan = {
          summary: sanitizeForPrompt(r.summary, 1100),
          steps: steps.slice(0, 16),
          tips: (Array.isArray(r.tips) ? r.tips : []).slice(0, 6).map(t => sanitizeForPrompt(t, 200)).filter(Boolean),
        };
      }
    } catch (e) { logger.warn(`merchant-path AI plan failed: ${e.message?.slice(0,80)}`); }

    res.json({
      mode,
      readinessScore,
      performanceHealth,
      readinessLabel,
      gaps: gapKeys.map(k => ({ key: k, label: MP_KEY_LABEL[k] || k })),
      strengths,
      weaknesses,
      plan,        // الخطة الجاهزة (fallback / مرجع)
      aiPlan,      // الخطة الذكية المخصّصة
      recommendedServices,
      remaining: perm.remaining, used: perm.used, limit: perm.limit,
    });
  })
);

module.exports = router;
