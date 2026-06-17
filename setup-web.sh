#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  أدوات التاجر — إعداد nginx + HTTPS (بعد توجيه الدومين للسيرفر)
#  الاستخدام:  bash setup-web.sh your-domain.com
# ════════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"
DOMAIN="$1"
if [ -z "$DOMAIN" ]; then echo "الاستخدام: bash setup-web.sh your-domain.com"; exit 1; fi

echo "▶ إعداد nginx للدومين: $DOMAIN"
CONF="/etc/nginx/sites-available/adwat"
sed -e "s#yourdomain.com#$DOMAIN#g" -e "s#/var/www/adwat#$ROOT#g" "$ROOT/deploy/nginx.conf.example" > "$CONF"
ln -sf "$CONF" /etc/nginx/sites-enabled/adwat
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "   ✓ nginx جاهز"

# تحديث رابط الواجهة في .env
if [ -f "$ROOT/backend/.env" ]; then
  sed -i "s#^FRONTEND_URL=.*#FRONTEND_URL=https://$DOMAIN#" "$ROOT/backend/.env"
  pm2 restart adwat-api >/dev/null 2>&1 || true
fi

echo "▶ تثبيت شهادة SSL (HTTPS)..."
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || \
  echo "   (لو فشل certbot: تأكد أن الدومين موجّه لـIP السيرفر ثم أعد: certbot --nginx -d $DOMAIN -d www.$DOMAIN)"

echo ""
echo "════════ ✓ تم. افتح: https://$DOMAIN ════════"
