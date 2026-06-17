# دليل رفع «أدوات التاجر» على Hostinger VPS

> يتطلب **Hostinger VPS** (KVM، Ubuntu 22.04/24.04). الاستضافة المشتركة لا تكفي.

## 1) تجهيز السيرفر (مرة واحدة)
```bash
ssh root@SERVER_IP
apt update && apt upgrade -y
# Node 20 + أدوات
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx postgresql postgresql-contrib
# Chrome (للمحلّل وتقارير PDF)
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
apt install -y ./google-chrome-stable_current_amd64.deb
# PM2
npm install -g pm2
```

## 2) قاعدة البيانات (مرة واحدة)
```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE adwat_altajer;
CREATE USER adwat WITH PASSWORD 'كلمة_قوية';
GRANT ALL PRIVILEGES ON DATABASE adwat_altajer TO adwat;
ALTER DATABASE adwat_altajer OWNER TO adwat;
SQL
```

## 3) الكود + البيئة
```bash
mkdir -p /var/www && cd /var/www
git clone <رابط_الريبو> adwat   # أو ارفع عبر SFTP (بدون _legacy_nextjs)
cd adwat/backend
cp .env.example .env && nano .env   # املأ القيم (تحت)
```
**القيم المهمة في `.env`:**
```
DATABASE_URL=postgresql://adwat:كلمة_قوية@localhost:5432/adwat_altajer
JWT_SECRET=سلسلة_عشوائية_32حرف_فأكثر
GEMINI_API_KEY=...
CHROME_PATH=/usr/bin/google-chrome
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
ALERT_EMAIL=بريدك   SMTP_USER=...   SMTP_PASS=...
BACKUP_UPLOAD_CMD=...   # اختياري: نسخة خارج الخادم (موصى به)
```

## 4) التشغيل
```bash
cd /var/www/adwat
bash deploy.sh        # يثبّت + يهاجر + يشغّل عبر PM2
pm2 startup           # نفّذ السطر الذي يطبعه (تشغيل بعد الإقلاع)
```

## 5) nginx + HTTPS
```bash
cp deploy/nginx.conf.example /etc/nginx/sites-available/adwat
nano /etc/nginx/sites-available/adwat       # غيّر yourdomain.com
ln -s /etc/nginx/sites-available/adwat /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 6) DNS + الجدار الناري
- Hostinger hPanel → DNS: سجل **A** لـ`@` و`www` → IP السيرفر.
```bash
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
```

## التحديث لاحقاً
```bash
cd /var/www/adwat && bash deploy.sh
```

## فحوصات ما بعد الرفع
- `https://yourdomain.com` يفتح، وجرّب أداة (تسجيل + محلّل).
- `pm2 logs adwat-api` — لا أخطاء.
- `curl -I https://yourdomain.com/backend/.env` → يجب أن يكون **404** (الحماية تعمل).
- `cd backend && npm run backup` — نسخة احتياطية تعمل.

## أمان (مطبّق في الكود)
- حماية SSRF (منع العناوين الداخلية في السحب)، Helmet، Rate-limit، CORS مقيّد، تهريب XSS، استعلامات معامَلة، 0 ثغرات npm.
- nginx يمنع كشف `/backend`, `.env`, `/logs`, `*.dump`.
