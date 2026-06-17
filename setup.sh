#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  أدوات التاجر — تنصيب تلقائي كامل على Ubuntu VPS (Hostinger KVM)
#  الاستخدام (مرة واحدة، كـ root، من جذر المشروع):
#     bash setup.sh
#  يثبّت: Node + PostgreSQL + Chrome + nginx + PM2 + swap،
#  ويجهّز قاعدة البيانات و .env تلقائيًا، ويشغّل المنصة.
# ════════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"
echo "════════ تنصيب أدوات التاجر — ابدأ ════════"

# 1) تحديث النظام + الأدوات الأساسية
echo "▶ [1/8] تحديث النظام..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git nginx postgresql postgresql-contrib ufw

# 2) Node.js 20 LTS
if ! command -v node >/dev/null 2>&1; then
  echo "▶ [2/8] تثبيت Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else echo "▶ [2/8] Node.js موجود: $(node -v)"; fi

# 3) Google Chrome (للمحلّل وتقارير PDF)
if ! command -v google-chrome >/dev/null 2>&1; then
  echo "▶ [3/8] تثبيت Google Chrome..."
  wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb
  apt-get install -y /tmp/chrome.deb && rm -f /tmp/chrome.deb
else echo "▶ [3/8] Chrome موجود"; fi

# 4) PM2
if ! command -v pm2 >/dev/null 2>&1; then echo "▶ [4/8] تثبيت PM2..."; npm install -g pm2; else echo "▶ [4/8] PM2 موجود"; fi

# 5) Swap 2GB (يمتص ارتفاعات الذاكرة من Chrome)
if [ ! -f /swapfile ]; then
  echo "▶ [5/8] تفعيل swap بحجم 2GB..."
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else echo "▶ [5/8] swap موجود"; fi

# 6) قاعدة البيانات (تُنشأ مرة واحدة بكلمة مرور عشوائية)
echo "▶ [6/8] إعداد قاعدة البيانات..."
DB_NAME="adwat_altajer"; DB_USER="adwat"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  DB_PASS="$(openssl rand -hex 16)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
SQL
  echo "$DB_PASS" > "$ROOT/.db_pass"   # نحفظها مؤقتًا لكتابتها في .env
  echo "   ✓ أُنشئت قاعدة البيانات بكلمة مرور عشوائية"
else echo "   ✓ المستخدم موجود مسبقًا (تخطّي إنشاء القاعدة)"; fi

# 7) ملف البيئة .env (يُنشأ تلقائيًا إن لم يوجد — الأسرار تُولّد، ومفاتيح الذكاء تملأها يدويًا)
echo "▶ [7/8] تجهيز ملف البيئة..."
ENV="$ROOT/backend/.env"
if [ ! -f "$ENV" ]; then
  DB_PASS="$(cat "$ROOT/.db_pass" 2>/dev/null || echo 'CHANGE_ME')"
  JWT="$(openssl rand -hex 32)"
  cat > "$ENV" <<ENVV
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
JWT_SECRET=$JWT
GEMINI_API_KEY=ضع_مفتاح_Gemini_هنا
GROQ_API_KEY=
CHROME_PATH=/usr/bin/google-chrome
PG_DUMP_PATH=pg_dump
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
ALERT_EMAIL=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
ENVV
  rm -f "$ROOT/.db_pass"
  echo "   ✓ أُنشئ backend/.env (تبقّى: ضع GEMINI_API_KEY والدومين)"
else echo "   ✓ backend/.env موجود (لن يُستبدل)"; fi

# 8) تثبيت الاعتماديات + الميجريشن + التشغيل عبر PM2
echo "▶ [8/8] تثبيت الباك إند وتشغيله..."
cd "$ROOT/backend"
npm install --omit=dev
npm run migrate || echo "   (تحذير: الميجريشن — قد تكون الجداول موجودة)"
cd "$ROOT"
if pm2 describe adwat-api >/dev/null 2>&1; then pm2 reload ecosystem.config.js --update-env; else pm2 start ecosystem.config.js; pm2 save; fi
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
pm2 save

# الجدار الناري
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
yes | ufw enable >/dev/null 2>&1 || true

echo ""
echo "════════ ✓ اكتمل التنصيب الأساسي ════════"
echo "تبقّى 3 خطوات بسيطة:"
echo "  1) عدّل المفتاح:   nano backend/.env   ← ضع GEMINI_API_KEY والدومين، ثم: pm2 restart adwat-api"
echo "  2) إعداد nginx:    bash setup-web.sh your-domain.com"
echo "  3) راقب:           pm2 logs adwat-api"
