#!/usr/bin/env bash
# سكربت رفع/تحديث "أدوات التاجر" على خادم VPS — شغّله من جذر المشروع: bash deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "==> سحب آخر تحديث من Git (إن وُجد)"
if [ -d .git ]; then git pull --ff-only || echo "    (تخطّي git pull)"; fi

echo "==> تثبيت اعتماديات الباك إند (إنتاج فقط)"
cd backend
npm install --omit=dev

echo "==> التأكد من ملف البيئة"
if [ ! -f .env ]; then
  echo "    تحذير: backend/.env غير موجود — انسخ .env.example واملأ القيم قبل المتابعة."
  echo "    cp .env.example .env && nano .env"
  exit 1
fi

echo "==> تشغيل ميجريشن قاعدة البيانات"
npm run migrate || echo "    (تحذير: الميجريشن أعاد خطأً — قد تكون الجداول موجودة)"
cd ..

echo "==> تشغيل/إعادة تحميل عبر PM2"
if pm2 describe adwat-api >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
  pm2 save
  echo "    ملاحظة: نفّذ مرة واحدة فقط: pm2 startup  (واتبع التعليمات لتشغيله بعد الإقلاع)"
fi

echo "==> تم. تابع السجلّ: pm2 logs adwat-api"
