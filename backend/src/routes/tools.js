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
async function scrapeStore(url) {
  try {
    const { data: html, headers: resHeaders } = await axios.get(url, {
      timeout: 18000,
      maxRedirects: 6,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    const $ = cheerio.load(html);
    const low = html.toLowerCase();

    // ── Meta & title ──────────────────────────────────────────────────────────
    const pageTitle    = $('title').text().trim();
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

    // ── Payment methods ───────────────────────────────────────────────────────
    const paymentMap = {
      'مدى':                  [/\bmada\b/i, /مدى/],
      'فيزا':                 [/\bvisa\b/i],
      'ماستركارد':            [/\bmastercard\b|master[\s-]?card/i],
      'STC Pay':              [/\bstcpay\b|stc[\s-]?pay/i],
      'Apple Pay':            [/apple[\s-]?pay/i],
      'تابي':                 [/\btabby\b|tabby\.ai|checkout\.tabby/i],
      'تمارا':                [/\btamara\b|tamara\.co/i],
      'PayPal':               [/\bpaypal\b/i],
      'Moyasar':              [/\bmoyasar\b/i],
      'HyperPay':             [/\bhyperpay\b/i],
      'PayTabs':              [/\bpaytabs\b/i],
      'Tap Payments':         [/\btap[\s-]?payment|\bgosell\b/i],
      'Stripe':               [/\bstripe\b|js\.stripe\.com/i],
      'الدفع عند الاستلام':  [/cash[\s-]?on[\s-]?delivery|\bcod\b|الدفع عند الاستلام|cash_on_delivery/i],
      'تحويل بنكي':          [/bank[\s-]?transfer|تحويل بنكي/i],
    };
    const paymentMethods = Object.entries(paymentMap)
      .filter(([, pats]) => pats.some(p => p.test(html)))
      .map(([name]) => name);

    // ── Social media ──────────────────────────────────────────────────────────
    const socialPatterns = {
      Instagram:  /instagram\.com\/(?!p\/|reel\/|explore\/)([a-zA-Z0-9_.]+)/,
      'Twitter/X': /(?:twitter|x)\.com\/(?!intent|share|home)([a-zA-Z0-9_]+)/,
      TikTok:     /tiktok\.com\/@([a-zA-Z0-9_.]+)/,
      Snapchat:   /snapchat\.com\/add\/([a-zA-Z0-9_.]+)/,
      YouTube:    /youtube\.com\/(?:channel\/|@|user\/)([^"'\s/]+)/,
      Facebook:   /facebook\.com\/([^"'\s/?#]+)/,
      WhatsApp:   /(?:wa\.me|whatsapp\.com\/send)[^"'\s]*/,
      LinkedIn:   /linkedin\.com\/(?:company|in)\/([^"'\s/]+)/,
    };
    const socialLinks = {};
    for (const [name, pat] of Object.entries(socialPatterns)) {
      const m = (allLinks + html).match(pat);
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
    const h1s = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 5);
    const h2s = $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 5);
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
  const content = (pageTitle + ' ' + metaDesc + ' ' + h1s.join(' ') + ' ' + html.slice(0, 5000)).toLowerCase();
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
async function fetchPageSpeed(url) {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) return { success: false, reason: 'no_key' };
  try {
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${key}`;
    const { data } = await axios.get(endpoint, { timeout: 35000 });
    const cats   = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits    || {};
    const sc = n => Math.round((n || 0) * 100);
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
    if (status !== 400 && status !== 403) logger.warn(`PageSpeed API failed: ${err.message?.slice(0, 80)}`);
    return { success: false };
  }
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
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
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
  if (scraped.hasSSL)                                    score += 10;
  if (scraped.hasReviewSection)                          score += 8;
  if (scraped.hasReturnPolicy)                           score += 7;
  if (scraped.hasWhatsAppFloat)                          score += 7;
  if (scraped.hasPaymentBadgesInFooter)                  score += 6;
  if (scraped.hasTrustBadges)                           score += 5;
  if (scraped.phoneNumbers?.length)                      score += 5;
  if (scraped.contactEmail)                              score += 5;
  if (Object.keys(scraped.socialLinks || {}).length >= 2) score += 4;
  if (scraped.hasChatWidget)                            score += 3;
  if (seoFiles?.hasSitemap)                             score += 3;
  if (scraped.hasNewsletterForm)                         score += 2;
  return Math.min(100, score);
}

// ─── Priority Score (Layer 13) ───────────────────────────────────────────────
function computePriorityScore(impact, confidence, ease) {
  return Math.round((impact * confidence * ease) / 10);
}

// ─── AI Providers: Gemini (primary) + Groq (emergency fallback) ───────────────
const logger = require('../logger');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const { takeStoreScreenshots } = require('../utils/screenshot');

const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const groqAI   = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const parseJSON = (raw) => {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') throw new Error('Empty AI response');
  const match = raw.match(/```json\s*([\s\S]+?)\s*```/) || raw.match(/\{[\s\S]+\}/);
  const str = match ? (match[1] || match[0]) : raw;
  try {
    return JSON.parse(str);
  } catch {
    throw new Error(`JSON parse failed: ${str.slice(0, 120)}`);
  }
};

// Groq fallback
const groqFallback = async (prompt, maxTokens = 4000) => {
  if (!groqAI) throw new Error('Groq not configured');
  const res = await groqAI.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt + '\n\nأجب بـ JSON صارم فقط.' }],
    response_format: { type: 'json_object' },
    temperature: 0.55,
    max_tokens: Math.min(maxTokens, 6000),
  });
  const content = res.choices[0].message.content;
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Groq JSON parse failed: ${content?.slice(0, 120)}`);
  }
};

// Gemini text — JSON output, fallback to Groq on any failure
const aiGenerateGemini = async (prompt, maxTokens = 4000, _attempt = 0) => {
  try {
    const model = geminiAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { maxOutputTokens: Math.min(maxTokens, 8192), temperature: 0.55 },
    });
    const result = await model.generateContent(prompt + '\n\nأجب بـ JSON صارم فقط بدون أي نص خارج الـ JSON.');
    const text = result.response.text();
    return parseJSON(text);
  } catch (e) {
    const is429 = e.status === 429 || e.message?.includes('429') || e.message?.includes('quota');
    if (is429 && _attempt < 1) {
      await new Promise(r => setTimeout(r, 3000));
      return aiGenerateGemini(prompt, maxTokens, _attempt + 1);
    }
    if (groqAI) {
      logger.warn(`Gemini failed (${e.message?.slice(0, 60)}) — switching to Groq`);
      return groqFallback(prompt, maxTokens);
    }
    throw e;
  }
};

// Gemini Vision — screenshots analysis, text fallback
const aiAnalyzeWithVision = async (prompt, imageParts) => {
  try {
    const model = geminiAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent([{ text: prompt }, ...imageParts.slice(0, 4)]);
    return parseJSON(result.response.text());
  } catch (e) {
    logger.warn(`Gemini Vision failed — text only: ${e.message?.slice(0, 80)}`);
    return aiGenerateGemini(prompt, 6000);
  }
};

// Gemini Chat — conversational (non-JSON)
const aiChat = async (systemPrompt, history, message) => {
  try {
    const model = geminiAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: systemPrompt }, ...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: message }],
        max_tokens: 500,
      });
      return res.choices[0].message.content;
    }
    throw e;
  }
};

logger.info(`AI: Gemini 2.0 Flash (primary)${groqAI ? ' + Groq (fallback)' : ''} ✓`);

// ─── Permission Check ─────────────────────────────────────────────────────────
async function checkToolPermission(userId, toolName, userToolsAccess) {
  try {
    const { rows } = await db.query('SELECT * FROM tool_settings WHERE tool_name=$1', [toolName]);
    const s = rows[0];
    if (!s) return { allowed: true };

    const hasExplicit = userToolsAccess && userToolsAccess[toolName] === true;

    if (s.is_paid && !hasExplicit)
      return { allowed: false, code: 'TOOL_PAID', toolName, displayName: s.display_name };

    if (s.daily_free_limit !== null && !hasExplicit) {
      const { rows: u } = await db.query(
        `SELECT COUNT(*) FROM tool_logs WHERE user_id=$1 AND tool_name=$2 AND created_at::date=CURRENT_DATE`,
        [userId, toolName]
      );
      const used = parseInt(u[0].count);
      if (used >= s.daily_free_limit)
        return { allowed: false, code: 'DAILY_LIMIT', used, limit: s.daily_free_limit, toolName, displayName: s.display_name };
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
  const { rows } = await db.query('SELECT tool_name, display_name, is_paid, daily_free_limit FROM tool_settings');
  res.json(rows);
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

  const prompt = `أنت محلل تجارة إلكترونية سعودي خبير. حلّل المتجر بناءً على البيانات الحقيقية أدناه.
الرابط: ${storeUrl} | التخصص: ${category || 'عام'}
${data}

معادلة overallScore — طبّقها حرفياً (15-100): ابدأ بـ 50.
+5 SSL | +5 CDN | +5 Structured Data | +5 robots.txt | +3 sitemap | +5 Robots Meta | +5 بحث | +4 سلة | +3 مفضلة | +3 قائمة جوال | +2 OG Image
+1 لكل طريقة دفع محلية (مدى/STC Pay/Apple Pay/تابي/تمارا) — حد أقصى +8
${ps ? `+5 إذا Performance ≥ 70 | +3 إذا Performance ≥ 50` : ''}
-10 صور بدون Alt > 40% | -5 سكريبتات > 25 | -5 لا H1 | -8 لا SSL | -5 لا سلة | -3 لا تواصل

أجب بـ JSON صارم فقط — ابدأ بـ { مباشرة:
{"overallScore":0,"storeName":"","platform":"","summary":"<4 جمل: الوضع الحالي بالأرقام + أكبر مشكلة + أكبر فرصة + التوقع>",
"seo":{"score":0,"items":[{"check":"","status":"pass|warn|fail","value":"","issue":"","fix":""}]},
"ux":{"score":0,"items":[{"name":"","score":0,"issue":"","fix":""}]},
"criteria":[{"name":"","score":0,"feedback":"<2-3 جمل بأرقام>","actions":["",""]}]}
criteria يضم 15 معيار: SEO، هوية البراند، وضوح التخصص، صفحات المنتجات، تجربة الشراء، التوافق مع الجوال، سرعة التحميل، السوق السعودي، وسائل الدفع، الشحن والتوصيل، دعم العملاء، الثقة والمصداقية، التسويق السوشيال، استراتيجية التسعير، برامج الولاء.`;
  return aiGenerateGemini(prompt, 8000);
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
أجب بـ JSON صارم فقط — ابدأ بـ { مباشرة:
{"visualScore":0,
"heroSection":{"score":0,"attentionGrabbing":"pass|warn|fail","messageClear":"pass|warn|fail","ctaVisible":"pass|warn|fail","improvement":""},
"productImages":{"score":0,"quality":"professional|amateur|mixed","bgConsistency":"pass|warn|fail","lighting":"good|poor","hasMultipleAngles":false,"issues":[]},
"brandConsistency":{"score":0,"colorHarmony":"pass|warn|fail","fontConsistency":"pass|warn|fail","overallCoherence":"pass|warn|fail"},
"visualAttention":{"firstFocus":"<أين ينظر العميل أولاً>","secondFocus":"<ثانياً>","distractors":[""]},
"premiumFeel":"premium|professional|mid|budget",
"items":[{"name":"","score":0,"status":"pass|warn|fail","issue":"","fix":""}]}
items: 13 معيار — وضوح CTA الرئيسي، التدرج البصري، تناسق الهوية والألوان، جودة صور المنتجات، Hero Section، التنظيم البصري، الخطوط وسهولة القراءة، إشارات الثقة المرئية، Social Proof، تجربة الجوال، عدم الازدحام البصري، مستوى الاحترافية Premium، اتساق التصميم.`;
  let result, visionUsed = false;
  if (imageParts.length) {
    result = await aiAnalyzeWithVision(prompt, imageParts);
    if (result._visionSource) { delete result._visionSource; }
    else visionUsed = true;
  } else {
    result = await aiGenerateGemini(prompt, 6000);
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
  const prompt = `محلل CRO وتجارة خليجية. حلّل متجر: ${storeUrl} (تخصص: ${category || 'عام'})
${data}${behData}${v4data}
أجب بـ JSON صارم فقط — ابدأ بـ { مباشرة:
{"croScore":0,"conversionProbability":0,
"checkoutFriction":{"score":0,"estimatedSteps":0,"issues":[""],"improvements":[""]},
"offerStrength":{"score":0,"urgencyScore":0,"scarcityScore":0,"socialProofScore":0,"issues":[""]},
"commerce":{"score":0,"items":[{"name":"","status":"pass|fail","detail":"","fix":""}]},
"cro":{"items":[{"name":"","score":0,"impact":"±X% معدل تحويل","revenueImpact":"SAR X-Y/month","detail":""}]},
"trust":{"score":0,"items":[{"name":"","status":"pass|fail","detail":""}]},
"behavioral":{"insights":["",""]},
"quickWins":["","","",""],"strengths":["","",""],"weaknesses":["","",""]}
conversionProbability: 0-100 احتمالية شراء زائر حقيقي.
checkoutFriction.estimatedSteps: عدد خطوات الدفع المتوقعة.
commerce: 8 معايير Gulf — Apple Pay, مدى, COD, WhatsApp, تابي/تمارا, RTL, العربية, الشحن المحلي.
cro: 10 معايير مع SAR revenue impact واقعي.
trust: 8 معايير ثقة.`;
  return aiGenerateGemini(prompt, 6000);
}

async function aiCallBusiness(scraped, category, benchmark, behavioral, security, storeUrl) {
  const si = scraped.success;
  const data = si ? `التخصص: ${category || 'عام'} | المنصة: ${scraped.platform}
متوسط الصناعة: ${benchmark.avgScore}/100 | أفضل 10%: ${benchmark.topScore}/100
طرق الدفع: ${scraped.paymentMethods.join(', ') || 'لم يُكتشف'}
أمان: ${security.score || 0}/100 — CSP:${security.headers?.csp ? '✓' : '✗'} HSTS:${security.headers?.hsts ? '✓' : '✗'}
مراجعات: ${scraped.hasReviewSection ? '✓' : '✗'} | إرجاع: ${scraped.hasReturnPolicy ? '✓' : '✗'} | Chat: ${scraped.hasChatWidget ? '✓' : '✗'}
سوشيال (${Object.keys(scraped.socialLinks || {}).length}): ${Object.keys(scraped.socialLinks || {}).join(', ') || 'لا'}` : `الرابط: ${storeUrl} | التخصص: ${category || 'عام'}`;
  const prompt = `خبير تجارة إلكترونية سعودي. حلّل فرص الإيرادات للمتجر: ${storeUrl}
${data}
أجب بـ JSON صارم فقط:
{"industry":{"items":[{"name":"","score":0,"status":"pass|warn|fail","detail":"","fix":""}]},
"revenue":{"estimatedMonthlyLoss":"SAR X-Y","topIssues":[{"issue":"","estimatedImpact":"SAR X/month","confidence":"high|medium|low"}]},
"security":{"score":0,"findings":[{"header":"","present":false,"risk":"","fix":""}]},
"actions":[{"task":"","reason":"","impact":"","priority":"high|medium|low","time":"","difficulty":"سهل|متوسط|صعب","confidence":0,"ease":0,"revenueImpact":"SAR X-Y/month","priorityScore":0}]}
industry: 6 معايير خاصة بـ ${category || 'المتاجر العامة'}.
revenue: أرقام SAR واقعية للسوق السعودي.
actions: 8 مهام مع priorityScore = Impact×Confidence×Ease/10.`;
  return aiGenerateGemini(prompt, 6000);
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
  return aiGenerateGemini(prompt, 4000);
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
  return aiGenerateGemini(prompt, 5000);
}

// ─── Store Analyzer v4 — Intelligence Engine ─────────────────────────────────
router.post('/analyze', auth,
  [body('storeUrl').isURL({ require_protocol: true }).withMessage('رابط المتجر غير صالح')],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'analyzer', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.code === 'TOOL_PAID'
        ? 'هذه الأداة مدفوعة. يمكنك طلب الوصول وسيتواصل معك الفريق.'
        : `وصلت للحد اليومي (${perm.used}/${perm.limit}). جرّب غداً أو تواصل معنا للوصول غير المحدود.`,
      ...perm,
    });

    const { storeUrl } = req.body;
    const category = sanitizeForPrompt(req.body.category, 100);
    const _urlError = validateStoreUrl(storeUrl);
    if (_urlError) return res.status(400).json({ error: _urlError });
    const url = new URL(storeUrl);

    const _cached = await getCached(storeUrl, category);
    if (_cached) return res.json({ ..._cached, _fromCache: true, remaining: perm.remaining, used: perm.used, limit: perm.limit });

    // Phase 1: 6 parallel data collectors — allSettled so one failure never kills the rest
    const _collectors = await Promise.allSettled([
      scrapeStore(storeUrl),
      fetchSEOFiles(storeUrl),
      fetchPageSpeed(storeUrl),
      takeStoreScreenshots(storeUrl),
      simulateBehavior(storeUrl),
      checkSecurityHeaders(storeUrl),
    ]);
    const [scraped, seoFiles, pageSpeed, screenshots, behavioral, security] = _collectors.map(
      (r, i) => r.status === 'fulfilled' ? r.value : (logger.warn(`collector[${i}] failed: ${r.reason?.message?.slice(0,60)}`), { success: false })
    );

    const platform = scraped.success ? scraped.platform
      : (url.hostname.includes('salla') ? 'سلة' : url.hostname.includes('zid') ? 'زد' : 'غير محدد');
    const storeName = (scraped.success && scraped.pageTitle) ? scraped.pageTitle : url.hostname.split('.')[0];
    const benchmark = getIndustryBenchmark(category);
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
      // Phase 3: 6 parallel AI calls — each isolated so one failure doesn't kill the rest
      const safe = (fn, name) => fn.catch(e => { logger.warn(`${name} failed: ${e.message?.slice(0,80)}`); return null; });
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
      };
      if (coreScore !== 60 || (_result.criteria || []).length > 0) await setCached(storeUrl, category, _result);
      saveSnapshot(req.user.id, storeUrl, _result).catch(() => {});
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
    body('features').trim().isLength({ min: 10 }).withMessage('يرجى إدخال ميزات المنتج'),
    body('tone').optional().isIn(['luxury', 'friendly', 'professional', 'youthful']),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const perm = await checkToolPermission(req.user.id, 'generator', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.code === 'TOOL_PAID'
        ? 'هذه الأداة مدفوعة. يمكنك طلب الوصول وسيتواصل معك الفريق.'
        : `وصلت للحد اليومي (${perm.used}/${perm.limit}). جرّب غداً أو تواصل معنا للوصول غير المحدود.`,
      ...perm,
    });

    const _raw = req.body;
    const productName    = sanitizeForPrompt(_raw.productName, 100);
    const features       = sanitizeForPrompt(_raw.features, 800);
    const category       = sanitizeForPrompt(_raw.category, 100);
    const tone           = _raw.tone || 'luxury';
    const targetAudience = sanitizeForPrompt(_raw.targetAudience, 200);
    const tones = {
      luxury:       'فاخر وراقٍ — يعكس الحصرية والجودة الحقيقية، مناسب للمنتجات الفاخرة والهدايا الراقية والعطور',
      friendly:     'ودود ودافئ — قريب من العميل كصديق يوصي بمنتج، طبيعي وبسيط بدون تكلف، مناسب للعائلة',
      professional: 'احترافي ومتخصص — يركز على المواصفات والأداء والأرقام، مناسب للإلكترونيات والأدوات والمعدات',
      youthful:     'شبابي وعصري — حيوي ومرح بلغة الجيل الجديد، مناسب للملابس الكاجوال والإكسسوارات والتقنية',
    };
    const selectedTone = tones[tone] || tones.luxury;

    const prompt = `أنت كاتب محتوى تسويقي عربي محترف. مهمتك كتابة محتوى حقيقي ومتكامل للمنتج التالي — ليس قوالب فارغة.

النبرة: ${selectedTone}
المنتج: ${productName}
التصنيف: ${category || 'عام'}
المواصفات والمميزات: ${features}
الجمهور: ${targetAudience || 'المتسوقون السعوديون'}

قواعد لا تُخالَف:
١. description يجب أن يكون ٥٠٠-٦٠٠ كلمة عربية فعلية — فقرات متدفقة — ليس قوائم
٢. ابدأ الوصف بمشهد أو لحظة يعيشها العميل — لا بـ "هذا المنتج" أو "نقدم لكم"
٣. كل bulletPoint يبدأ بـ "اشعر بـ" أو "استمتع بـ" أو "انعم بـ" أو "احمِ" أو "تميّز بـ"
٤. اذكر اسم المنتج "${productName}" في الوصف مرتين على الأقل بشكل طبيعي
٥. metaDescription بين ١٥٠-١٦٠ حرف بالضبط — عدّ الحروف بدقة
٦. socialPost.instagram ينتهي بـ ٥ هاشتاقات عربية و٣ إنجليزية
٧. adCopy: ٢-٣ جمل قصيرة مباشرة جداً تنتهي بـ CTA

مستوى الوصف المطلوب: ابدأ بمشهد حسي يعيشه المستخدم مع "${productName}" — ليس وصفاً للمنتج بل تصويراً لحياة أفضل بعد امتلاكه. تجنّب: "نقدم لكم"، "يسعدنا"، "هذا المنتج يتميز بـ".

أجب بـ JSON فقط — لا تفسيرات ولا نص خارج الـ JSON — لا تستخدم markdown. ابدأ بـ { مباشرة:
{
"title": "<عنوان SEO 7-9 كلمات يبدأ بالكلمة المفتاحية الرئيسية>",
"alternativeTitles": [
  "<عنوان يركز على الفائدة العاطفية>",
  "<عنوان يركز على مواصفة مميزة>",
  "<عنوان يثير الفضول والرغبة>"
],
"openingHook": "<جملة 15-25 كلمة: مشهد أو سؤال أو حقيقة مفاجئة تشدّ الانتباه فوراً>",
"shortDescription": "<2-3 جمل 60-80 كلمة: تضم الكلمة المفتاحية + أبرز فائدة + سبب للنقر>",
"description": "<وصف 500-600 كلمة عربية حقيقية في فقرات: [افتتاحية: مشهد يخطف الانتباه] [قصة المنتج وقيمته] [تحويل المواصفات إلى تجارب حسية] [بناء الثقة بتفاصيل دقيقة] [صورة الحياة بعد الشراء] [خاتمة: CTA ذكي يخلق إلحاحاً]>",
"bulletPoints": [
  "<اشعر بـ ... نتيجة ملموسة محددة>",
  "<استمتع بـ ... فائدة مختلفة>",
  "<انعم بـ ... فائدة عملية>",
  "<احمِ ... أو تميّز بـ ...>",
  "<اكتشف ... ميزة فريدة>",
  "<وفّر ... أو احتفظ بـ ...>",
  "<اطمئن بـ ... ضمان أو جودة>",
  "<استثمر في ... قيمة طويلة الأمد>"
],
"metaDescription": "<150-160 حرف بالضبط: الكلمة المفتاحية أولاً + فائدة + CTA>",
"keywords": {
  "primary": ["<كلمة 1>", "<كلمة 2>", "<كلمة 3>"],
  "secondary": ["<كلمة>", "<كلمة>", "<كلمة>", "<كلمة>"],
  "longTail": ["<جملة بحث 1>", "<جملة 2>", "<جملة 3>", "<جملة 4>", "<جملة 5>"]
},
"socialPost": {
  "instagram": "<hook قوي في السطر الأول\\n\\nفقرة 2\\n\\nفقرة 3\\n\\nفقرة 4\\n\\n#هاشتاق1 #هاشتاق2 #هاشتاق3 #هاشتاق4 #هاشتاق5 #hashtag1 #hashtag2 #hashtag3>",
  "twitter": "<أقل من 260 حرف: hook + فائدة + هاشتاق>",
  "whatsapp": "<3-4 أسطر ودية: اسم المنتج + أبرز ميزة + رابط المتجر>"
},
"faq": [
  {"q": "<سؤال شائع قبل الشراء>", "a": "<إجابة تزيل الشك وتبني الثقة>"},
  {"q": "<سؤال عن الجودة أو المواصفات>", "a": "<إجابة تفصيلية>"},
  {"q": "<سؤال عن الشحن أو الإرجاع>", "a": "<إجابة تريح البال>"}
],
"emailSubject": "<أقل من 55 حرف: يثير فضول أو يعد بفائدة>",
"adCopy": "<2-3 جمل مباشرة تبدأ بمشكلة أو رغبة وتنتهي بـ CTA واضح>"
}`;

    try {
      const content = await aiGenerateGemini(prompt, 6000);
      await db.query(
        'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'generator', { productName, features, category, tone }, content]
      ).catch(() => {});
      res.json({ ...content, remaining: perm.remaining, used: perm.used, limit: perm.limit });
    } catch (err) {
      logger.error('Generator error:', err.message);
      res.status(500).json({ error: 'حدث خطأ أثناء التوليد. تأكد من مفتاح الذكاء الاصطناعي وحاول مرة أخرى.' });
    }
  })
);

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
const CHAT_SYSTEM = `أنت "تاجر" — مساعد ذكي لموقع "أدوات التاجر"، منصة سعودية متخصصة لأصحاب المتاجر الإلكترونية.

شخصيتك:
- تتكلم بالعربية الخليجية الودودة — طبيعية ودافئة بدون تصنّع
- ترحّب بالزوار بحرارة وتسأل كيف تقدر تساعد
- تتعاطف مع مشاكل التاجر وتعطيه حلول عملية مباشرة
- إذا ما عرفت الإجابة قل "ما عندي معلومة كافية عن هذا، بس أوصلك للفريق عشان يساعدك"
- أنت مساعد ذكاء اصطناعي — إذا سألك أحد كن صريحاً بذلك

خدمات الموقع:
• محلل المتجر: تحليل عميق بـ Gemini Vision — يكشف مشاكل SEO + تصميم + تجربة المستخدم مع اسكرينشوت فعلية
• مولّد المحتوى: أوصاف منتجات عربية احترافية محسّنة لمحركات البحث
• مولّد صور المنتجات: صور تسويقية احترافية بالذكاء الاصطناعي (خلفية بيضاء / lifestyle / فاخر / flat lay)
• كوبونات حصرية: خصومات على سلة وزد وأدوات التجارة
• تقويم المواسم: المناسبات التجارية السعودية طول السنة
• خدمات احترافية: تصميم متاجر، سوشيال ميديا، SEO، حملات إعلانية، هوية بصرية

نصائح تجارية تعرفها وتشاركها:
- أفضل وقت للإعلانات: الخميس والجمعة مساءً في السعودية
- معدل التحويل الطبيعي 1-3%، فوق 3% ممتاز
- سلة أكثر تخصيصاً، زد أسرع في الإعداد
- MADA ضروري للسوق السعودي، STC Pay وApple Pay يرفعون معدل الشراء
- وقت الذروة للتسوق: 9-11 مساءً توقيت السعودية

أجب دائماً: عربي سعودي عامي طبيعي — 3-5 جمل — عملي ومباشر.`;


router.post('/chat', optionalAuth,
  [
    body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('الرسالة فارغة أو طويلة جداً'),
    body('history').optional().isArray({ max: 20 }),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { message, history = [] } = req.body;
    try {
      const reply = await aiChat(CHAT_SYSTEM, history, message);
      res.json({ reply });
    } catch (err) {
      logger.error('Chat error:', err?.message || String(err));
      res.status(500).json({ error: 'المساعد غير متاح حالياً، حاول مرة أخرى.' });
    }
  })
);

// ─── Product Image Generator ──────────────────────────────────────────────────
router.post('/generate-image', auth,
  [
    body('productName').trim().isLength({ min: 2 }).withMessage('اسم المنتج مطلوب'),
    body('style').optional().isIn(['white', 'lifestyle', 'luxury', 'flat', 'outdoor']),
  ],
  ar(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    if (!geminiAI) return res.status(503).json({ error: 'أضف GEMINI_API_KEY في .env لتفعيل توليد الصور.' });

    const perm = await checkToolPermission(req.user.id, 'image-gen', req.user.tools_access);
    if (!perm.allowed) return res.status(403).json({
      error: perm.code === 'TOOL_PAID'
        ? 'هذه الأداة مدفوعة. يمكنك طلب الوصول وسيتواصل معك الفريق.'
        : `وصلت للحد اليومي (${perm.used}/${perm.limit}). جرّب غداً.`,
      ...perm,
    });

    const { productName, style = 'white' } = req.body;
    const description = sanitizeForPrompt(req.body.description || '', 200);
    const colors = sanitizeForPrompt(req.body.colors || '', 100);

    const styleMap = {
      white:     'pure white seamless background, soft studio lighting, subtle drop shadow, professional product photography',
      lifestyle: 'lifestyle setting, natural environment, shallow depth of field bokeh background, warm natural lighting',
      luxury:    'dark elegant background, dramatic golden rim lighting, subtle sparkle, luxury high-end commercial photography',
      flat:      'flat lay top-down view, clean minimal background, complementary props arranged artfully, overhead shot',
      outdoor:   'outdoor natural setting, golden hour sunlight, beautiful natural background, lifestyle photography',
    };
    const styleDesc = styleMap[style] || styleMap.white;

    const imgPrompt = `Professional e-commerce product photo for Saudi Arabian online store. Product: ${productName}. ${description ? 'Details: ' + description + '. ' : ''}${colors ? 'Color scheme: ' + colors + '. ' : ''}Photography style: ${styleDesc}. Ultra high quality, sharp focus, commercial grade, ready for online store listing. No text or watermarks.`;

    try {
      const model = geminiAI.getGenerativeModel({
        model: 'gemini-2.0-flash-preview-image-generation',
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      });
      const result = await model.generateContent(imgPrompt);
      const parts = result.response.candidates[0].content.parts;
      const imgPart = parts.find(p => p.inlineData);

      if (!imgPart) throw new Error('لم يتم توليد صورة من النموذج');

      await db.query(
        'INSERT INTO tool_logs(user_id,tool_name,input_data,result_data) VALUES($1,$2,$3,$4)',
        [req.user.id, 'image-gen', { productName, style }, { generated: true }]
      ).catch(() => {});

      logger.info(`Image generated: ${productName} (${style})`);
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
      error: perm.code === 'TOOL_PAID'
        ? 'هذه الأداة مدفوعة. يمكنك طلب الوصول وسيتواصل معك الفريق.'
        : `وصلت للحد اليومي (${perm.used}/${perm.limit}). جرّب غداً أو تواصل معنا للوصول غير المحدود.`,
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
    "icon": "👋",
    "messages": [
      "<رسالة ترحيب دافئة تذكر ${storeName} وتبرز شيئاً مميزاً في ${productType}>",
      "<رسالة ترحيب بزاوية مختلفة: تسلّط الضوء على تجربة الشراء وسهولتها>",
      "<رسالة ترحيب مع هدية أو كود خصم حصري للعميل الجديد>"
    ]
  },
  {
    "type": "promotion",
    "title": "الترويج والعروض",
    "icon": "🔥",
    "messages": [
      "<رسالة تخلق FOMO حقيقي حول ${productType} مع توقيت محدد>",
      "<رسالة تركز على قيمة ${productType} لا على السعر>${currentOffer ? ' تذكر: ' + currentOffer : ''}",
      "<رسالة عرض محدود الوقت بصياغة خليجية جذابة>"
    ]
  },
  {
    "type": "abandoned_cart",
    "title": "استعادة العربة المتروكة",
    "icon": "🛒",
    "messages": [
      "<رسالة لطيفة تُذكّر بالعربة دون إلحاح — تستخدم الفضول>",
      "<رسالة تضيف حافزاً إضافياً: شحن مجاني أو خصم>${currentOffer ? ' أو تذكير بـ: ' + currentOffer : ''}",
      "<رسالة أخيرة تخلق urgency حقيقي بمخزون محدود أو انتهاء عرض>"
    ]
  },
  {
    "type": "order_confirm",
    "title": "تأكيد الطلب والشحن",
    "icon": "📦",
    "messages": [
      "<رسالة تأكيد دافئة تبني انتظاراً إيجابياً وتذكر اسم المتجر>",
      "<رسالة مع توقعات التوصيل وما سيحدث خطوة بخطوة>",
      "<رسالة إشعار خروج الشحنة مع رابط التتبع>"
    ]
  },
  {
    "type": "review_request",
    "title": "طلب التقييم والرأي",
    "icon": "⭐",
    "messages": [
      "<رسالة طلب تقييم تشعر العميل بأن رأيه يُغيّر شيئاً فعلاً>",
      "<رسالة تربط التقييم بمكافأة أو كوبون للشراء القادم>",
      "<رسالة قصيرة ومباشرة جداً بصياغة عفوية>"
    ]
  },
  {
    "type": "followup",
    "title": "المتابعة ما بعد الشراء",
    "icon": "💬",
    "messages": [
      "<رسالة سؤال عن رضا العميل عن ${productType} بشكل طبيعي غير تسويقي>",
      "<رسالة نصيحة استخدام أو عناية مناسبة لـ ${productType}>",
      "<رسالة تعرض منتجاً مكملاً بأسلوب توصية صديق>"
    ]
  },
  {
    "type": "seasonal",
    "title": "العروض الموسمية والمناسبات",
    "icon": "🎊",
    "messages": [
      "<رسالة رمضانية تربط ${productType} بروحانية الشهر وهدايا العيد>",
      "<رسالة اليوم الوطني السعودي مع عرض خاص لـ ${storeName}>",
      "<رسالة موسم التخفيضات مع ${productType} كهدية مثالية>"
    ]
  },
  {
    "type": "new_product",
    "title": "إطلاق منتج جديد",
    "icon": "✨",
    "messages": [
      "<رسالة تشويق إطلاق تبني فضول حول إضافة جديدة في ${productType}>",
      "<رسالة حصرية للعملاء الأوفياء: وصول مبكر قبل الجميع>",
      "<رسالة مع عرض أوائل الشراء يستمر 24 ساعة فقط>"
    ]
  }
]
}`;

    try {
      const content = await aiGenerateGemini(prompt, 5000);
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
      error: perm.code === 'TOOL_PAID'
        ? 'هذه الأداة مدفوعة. يمكنك طلب الوصول وسيتواصل معك الفريق.'
        : `وصلت للحد اليومي (${perm.used}/${perm.limit}). جرّب غداً أو تواصل معنا للوصول غير المحدود.`,
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
      const analysis = await aiGenerateGemini(prompt, 3500);
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
      error: perm.code === 'TOOL_PAID'
        ? 'هذه الأداة مدفوعة. يمكنك طلب الوصول وسيتواصل معك الفريق.'
        : `وصلت للحد اليومي (${perm.used}/${perm.limit}). جرّب غداً أو تواصل معنا للوصول غير المحدود.`,
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
      const content = await aiGenerateGemini(prompt, tokenLimit);
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
      error: perm.code === 'TOOL_PAID'
        ? 'هذه الأداة مدفوعة. يمكنك طلب الوصول وسيتواصل معك الفريق.'
        : `وصلت للحد اليومي (${perm.used}/${perm.limit}). جرّب غداً أو تواصل معنا للوصول غير المحدود.`,
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
      "icon": "↩️",
      "content": "<سياسة إرجاع كاملة ${returnDays} يوم، تغطي: الشروط + الاستثناءات + خطوات الإرجاع + الاسترداد المالي + حالات خاصة لـ ${productType}>"
    },
    {
      "id": "shipping",
      "title": "سياسة الشحن والتوصيل",
      "icon": "🚚",
      "content": "<سياسة شحن كاملة، تغطي: مناطق التوصيل في ${city} + المدة ${shippingDays} أيام + تكاليف الشحن + التتبع + الحالات الاستثنائية + التأخير>"
    },
    {
      "id": "privacy",
      "title": "سياسة الخصوصية وحماية البيانات",
      "icon": "🔒",
      "content": "<سياسة خصوصية متوافقة مع الأنظمة السعودية، تغطي: ما نجمعه + كيف نستخدمه + مشاركة البيانات + الحماية + حقوق المستخدم + ملفات الكوكيز>"
    },
    {
      "id": "terms",
      "title": "الشروط والأحكام العامة",
      "icon": "📋",
      "content": "<شروط وأحكام كاملة، تغطي: قبول الشروط + حساب المستخدم + الملكية الفكرية + المسؤولية + الدفع والتسعير + التعديلات + القانون المطبق (المملكة العربية السعودية)>"
    }
  ]
}`;

    try {
      const content = await aiGenerateGemini(prompt, 6000);
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
      error: perm.code === 'TOOL_PAID'
        ? 'هذه الأداة مدفوعة. يمكنك طلب الوصول وسيتواصل معك الفريق.'
        : `وصلت للحد اليومي (${perm.used}/${perm.limit}). جرّب غداً أو تواصل معنا للوصول غير المحدود.`,
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
      const content = await aiGenerateGemini(prompt, 8000);
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
      error: perm.code === 'TOOL_PAID'
        ? 'هذه الأداة مدفوعة. يمكنك طلب الوصول وسيتواصل معك الفريق.'
        : `وصلت للحد اليومي (${perm.used}/${perm.limit}). جرّب غداً أو تواصل معنا للوصول غير المحدود.`,
      ...perm,
    });

    const { storeUrl } = req.body;
    const category = sanitizeForPrompt(req.body.category, 100);
    const urlErr = validateStoreUrl(storeUrl);
    if (urlErr) return res.status(400).json({ error: urlErr });

    // Check cache (v5 uses its own key prefix)
    const cacheKey = 'v5:' + storeUrl.toLowerCase().trim() + '|' + (category || '');
    const cached = await getCached(cacheKey, 'v5');
    if (cached) return res.json({ ...cached, _fromCache: true, remaining: perm.remaining, used: perm.used, limit: perm.limit });

    const url = new URL(storeUrl);

    // Layer 1: Data collectors
    const _cols = await Promise.allSettled([
      scrapeStore(storeUrl),
      fetchSEOFiles(storeUrl),
      fetchPageSpeed(storeUrl),
      takeStoreScreenshots(storeUrl),
      checkSecurityHeaders(storeUrl),
    ]);
    const [scraped, seoFiles, pageSpeed, screenshots, security] = _cols.map(
      (r, i) => r.status === 'fulfilled' ? r.value : { success: false }
    );

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
    'SELECT id,tool_name,input_data,created_at FROM tool_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',
    [req.user.id]
  );
  res.json(rows);
}));

module.exports = router;
