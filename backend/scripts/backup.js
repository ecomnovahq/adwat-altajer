// نسخ احتياطي لقاعدة البيانات (pg_dump) — تدوير محلي + رفع سحابي اختياري
// يُشغَّل تلقائياً من الكرون (يومياً) أو يدوياً: npm run backup
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../src/logger');

const DB_URL     = process.env.DATABASE_URL;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const KEEP_DAYS  = parseInt(process.env.BACKUP_KEEP_DAYS || '14', 10);
const UPLOAD_CMD = process.env.BACKUP_UPLOAD_CMD || ''; // أمر اختياري؛ {file} يُستبدل بمسار الملف

// إيجاد pg_dump: المتغيّر صراحةً، ثم تثبيت PostgreSQL على ويندوز، ثم PATH
function resolvePgDump() {
  if (process.env.PG_DUMP_PATH) return process.env.PG_DUMP_PATH;
  if (process.platform === 'win32') {
    try {
      const base = 'C:/Program Files/PostgreSQL';
      if (fs.existsSync(base)) {
        const vers = fs.readdirSync(base).filter(v => /^\d+$/.test(v)).sort((a, b) => b - a);
        for (const v of vers) { const p = `${base}/${v}/bin/pg_dump.exe`; if (fs.existsSync(p)) return p; }
      }
    } catch { /* تجاهل */ }
  }
  return 'pg_dump';
}

function stamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// حذف النسخ الأقدم من KEEP_DAYS
function rotate() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const cutoff = Date.now() - KEEP_DAYS * 86400000;
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    if (!/^adwat_.*\.dump$/.test(f)) continue;
    const fp = path.join(BACKUP_DIR, f);
    try { if (fs.statSync(fp).mtimeMs < cutoff) { fs.unlinkSync(fp); logger.info('[backup] حُذفت نسخة قديمة: ' + f); } } catch { /* تجاهل */ }
  }
}

function runBackup() {
  return new Promise((resolve, reject) => {
    if (!DB_URL) return reject(new Error('DATABASE_URL غير محدّد'));
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const file = path.join(BACKUP_DIR, `adwat_${stamp()}.dump`);
    const pgDump = resolvePgDump();
    // صيغة custom مضغوطة (-Fc) — تُستعاد عبر pg_restore
    const args = ['-Fc', '--no-owner', '--no-privileges', '-f', file, '-d', DB_URL];
    const proc = spawn(pgDump, args, { windowsHide: true });
    let errOut = '';
    proc.stderr.on('data', d => { errOut += d; });
    proc.on('error', e => reject(new Error(`تعذّر تشغيل pg_dump (${pgDump}): ${e.message} — اضبط PG_DUMP_PATH في .env`)));
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`pg_dump فشل (رمز ${code}): ${errOut.slice(0, 300)}`));
      let size = 0; try { size = fs.statSync(file).size; } catch { /* تجاهل */ }
      logger.info(`[backup] نسخة جاهزة: ${path.basename(file)} (${(size / 1048576).toFixed(2)} MB)`);
      rotate();
      if (UPLOAD_CMD) {
        exec(UPLOAD_CMD.replace(/\{file\}/g, file), (e, _so, se) => {
          if (e) logger.error('[backup] فشل الرفع السحابي: ' + String(se || e.message).slice(0, 200));
          else logger.info('[backup] تم الرفع السحابي');
          resolve(file);
        });
      } else resolve(file);
    });
  });
}

module.exports = { runBackup };

// تشغيل مباشر
if (require.main === module) {
  runBackup()
    .then(f => { logger.info('[backup] اكتمل: ' + f); process.exit(0); })
    .catch(e => { logger.error('[backup] خطأ: ' + e.message); process.exit(1); });
}
