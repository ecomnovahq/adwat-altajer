'use strict';

const { calculateLoss } = require('../revenue/calculator');

module.exports = [
  {
    id: 'PERF_001',
    check: (d) => {
      if (!d.lcp) return false;
      const sec = parseFloat(d.lcp);
      return sec > 4.0;
    },
    build: (d, ctx) => {
      const sec = parseFloat(d.lcp) || 5;
      const extraSec = Math.max(0, Math.round(sec - 3));
      return {
        id: 'PERF_001', severity: 'critical', category: 'performance',
        title: `سرعة التحميل بطيئة جداً (${d.lcp})`,
        description: `كل ثانية إضافية فوق 3 ثوانٍ تُخسّر 7% من الزوار. موقعك يحتاج ${extraSec} ثانية إضافية.`,
        monthlyLoss: Math.round(calculateLoss('slow_loading', ctx) * extraSec),
        fixDifficulty: 3, fixTimeHours: 6,
        fixSteps: [
          'فعّل ضغط الصور (WebP) — الأكبر أثراً',
          'فعّل Lazy Loading لجميع الصور',
          'أزل سكريبتات غير ضرورية (GTM, Hotjar إذا لم تستخدمها)',
          'فعّل CDN إذا لم يكن مفعّلاً',
        ],
        sources: ['Google Web Vitals Report 2024'],
      };
    },
  },
  {
    id: 'PERF_002',
    check: (d) => d.performanceScore !== undefined && d.performanceScore < 50,
    build: (d, ctx) => ({
      id: 'PERF_002', severity: 'high', category: 'performance',
      title: `أداء Lighthouse ضعيف (${d.performanceScore}/100)`,
      description: 'Google يُعاقب المواقع البطيئة في نتائج البحث وإعلانات Google.',
      monthlyLoss: Math.round(calculateLoss('slow_loading', ctx) * 1.5),
      fixDifficulty: 3, fixTimeHours: 8,
      fixSteps: ['استخدم PageSpeed Insights لتحديد أكبر مشكلة', 'فعّل التخزين المؤقت (Caching) على السيرفر', 'قلّل حجم ملفات CSS/JS'],
      sources: ['Google Lighthouse Documentation'],
    }),
  },
  {
    id: 'PERF_003',
    check: (d) => !d.hasCDN,
    build: (d, ctx) => ({
      id: 'PERF_003', severity: 'medium', category: 'performance',
      title: 'CDN غير مفعّل',
      description: 'CDN يُقرّب الملفات من الزائر — يُسرّع التحميل 30-50% للمستخدمين البعيدين.',
      monthlyLoss: Math.round(calculateLoss('slow_loading', ctx) * 0.5),
      fixDifficulty: 2, fixTimeHours: 2,
      fixSteps: ['فعّل Cloudflare (مجاني)', 'أو استخدم CDN المدمج في سلة/زد', 'تحقق من تفعيله بأداة cdnplanet.com'],
      sources: ['Cloudflare Performance Report'],
    }),
  },
  {
    id: 'PERF_004',
    check: (d) => d.scriptsCount > 25,
    build: (d, ctx) => ({
      id: 'PERF_004', severity: 'medium', category: 'performance',
      title: `عدد سكريبتات مرتفع (${d.scriptsCount} سكريبت)`,
      description: 'كل سكريبت إضافي يُضيف وقتاً لتحميل الصفحة. 25+ سكريبت يُبطئ بشكل ملحوظ.',
      monthlyLoss: Math.round(calculateLoss('slow_loading', ctx) * 0.3),
      fixDifficulty: 2, fixTimeHours: 3,
      fixSteps: ['احذف تتبعات لا تستخدمها (Hotjar, Segment, إلخ)', 'اجمع أدوات التتبع في Google Tag Manager'],
      sources: ['Web.dev Performance Best Practices'],
    }),
  },
  {
    id: 'PERF_005',
    check: (d) => d.totalImgs > 0 && d.lazyLoadedImgs / d.totalImgs < 0.5,
    build: (d, ctx) => ({
      id: 'PERF_005', severity: 'medium', category: 'performance',
      title: `Lazy Loading غير مفعّل (${d.lazyLoadedImgs || 0}/${d.totalImgs} صورة)`,
      description: 'تحميل جميع الصور دفعة واحدة يُبطئ التحميل الأولي للصفحة.',
      monthlyLoss: Math.round(calculateLoss('slow_loading', ctx) * 0.25),
      fixDifficulty: 1, fixTimeHours: 1,
      fixSteps: ['أضف loading="lazy" لجميع الصور خارج المنطقة المرئية', 'سلة/زد: فعّل Lazy Loading من إعدادات الثيم'],
      sources: ['Google Web Fundamentals'],
    }),
  },
  {
    id: 'PERF_006',
    check: (d) => !d.hasSSL,
    build: (d, ctx) => ({
      id: 'PERF_006', severity: 'critical', category: 'performance',
      title: 'الموقع بدون HTTPS',
      description: 'المتاجر بدون SSL تُعاقَب من Google وتُحذَّر منها المتصفحات — يُدمر الثقة.',
      monthlyLoss: Math.round((ctx.visitors || 1000) * 0.019 * (ctx.aov || 250) * 0.5),
      fixDifficulty: 2, fixTimeHours: 2,
      fixSteps: ['فعّل شهادة SSL مجانية من مزود الاستضافة', 'أو استخدم Cloudflare SSL المجاني', 'تأكد من إعادة توجيه HTTP إلى HTTPS'],
      sources: ['Google Search Central'],
    }),
  },
];
