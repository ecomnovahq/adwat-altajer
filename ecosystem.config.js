// إعداد PM2 لتشغيل باك إند أدوات التاجر بثبات (auto-restart + يصمد بعد إعادة تشغيل السيرفر)
// التشغيل من جذر المشروع: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'adwat-api',
      cwd: './backend',
      script: 'src/app.js',
      instances: 1,          // مهم: نسخة واحدة فقط — التطبيق يستخدم cron وحالة في الذاكرة
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M', // يعيد التشغيل لو تجاوز الذاكرة (Puppeteer ثقيل)
      env: {
        NODE_ENV: 'production',
      },
      error_file: '../logs/pm2-error.log',
      out_file: '../logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
