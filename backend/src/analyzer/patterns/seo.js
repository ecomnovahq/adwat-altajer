'use strict';

const { calculateLoss } = require('../revenue/calculator');

module.exports = [
  {
    id: 'SEO_001',
    check: (d) => !d.metaDesc || d.metaDesc.length < 50,
    build: (d, ctx) => ({
      id: 'SEO_001', severity: 'high', category: 'seo',
      title: 'وصف الصفحة (Meta Description) مفقود أو قصير',
      description: 'الوصف يظهر في نتائج Google — غيابه يُقلل نسبة النقر بنسبة 8%.',
      monthlyLoss: calculateLoss('missing_meta_desc', ctx),
      fixDifficulty: 1, fixTimeHours: 1,
      fixSteps: ['أضف وصفاً بين 120-160 حرفاً يصف المتجر', 'اذكر أبرز المنتجات أو الميزة التنافسية', 'مثال: "متجر عباءات فاخرة | شحن مجاني | أكثر من 500 تصميم"'],
      sources: ['Google Search Central - Meta Description'],
    }),
  },
  {
    id: 'SEO_002',
    check: (d) => !d.h1s || d.h1s.length === 0,
    build: (d, ctx) => ({
      id: 'SEO_002', severity: 'high', category: 'seo',
      title: 'لا يوجد عنوان H1',
      description: 'H1 هو أهم إشارة لـ Google لفهم موضوع الصفحة — غيابه يُضعف الترتيب.',
      monthlyLoss: Math.round(calculateLoss('missing_meta_desc', ctx) * 0.7),
      fixDifficulty: 1, fixTimeHours: 0.5,
      fixSteps: ['أضف H1 واحداً فقط في الصفحة الرئيسية', 'يجب أن يصف المتجر أو فئة المنتجات الرئيسية'],
      sources: ['Google SEO Starter Guide'],
    }),
  },
  {
    id: 'SEO_003',
    check: (d) => !d.hasRobots,
    build: (d, ctx) => ({
      id: 'SEO_003', severity: 'medium', category: 'seo',
      title: 'ملف robots.txt غير موجود',
      description: 'robots.txt يُوجّه Google لما يُفهرسه وما يتجاهله — غيابه يُضيّع زحف محركات البحث.',
      monthlyLoss: Math.round(calculateLoss('missing_meta_desc', ctx) * 0.4),
      fixDifficulty: 1, fixTimeHours: 0.5,
      fixSteps: ['أنشئ ملف /robots.txt', 'أضف: User-agent: * / Allow: /', 'أضف رابط Sitemap في النهاية'],
      sources: ['Google Search Central - robots.txt'],
    }),
  },
  {
    id: 'SEO_004',
    check: (d) => !d.hasSitemap,
    build: (d, ctx) => ({
      id: 'SEO_004', severity: 'medium', category: 'seo',
      title: 'خريطة الموقع (Sitemap) مفقودة',
      description: 'Sitemap يُسرّع فهرسة المنتجات الجديدة في Google — مهم بشكل خاص للمتاجر الكبيرة.',
      monthlyLoss: Math.round(calculateLoss('missing_meta_desc', ctx) * 0.4),
      fixDifficulty: 1, fixTimeHours: 0.5,
      fixSteps: ['سلة/زد: ينشئ Sitemap تلقائياً — تأكد من تقديمه لـ Google Search Console', 'أرسل Sitemap لـ Google Search Console من قسم "فهرسة"'],
      sources: ['Google Search Console Help'],
    }),
  },
  {
    id: 'SEO_005',
    check: (d) => !d.technologies?.includes('Google Analytics') && !d.technologies?.includes('Google Tag Manager'),
    build: (d, ctx) => ({
      id: 'SEO_005', severity: 'medium', category: 'seo',
      title: 'لا يوجد تتبع Analytics',
      description: 'بدون Analytics لا تعرف من أين يأتي الزوار ولا ما يفعلونه — تعمل بدون بيانات.',
      monthlyLoss: 0,
      fixDifficulty: 1, fixTimeHours: 1,
      fixSteps: ['أنشئ حساب Google Analytics 4 مجانياً', 'أضف كود التتبع عبر Google Tag Manager', 'اربط Search Console بـ Analytics'],
      sources: ['Google Analytics Help Center'],
    }),
  },
  {
    id: 'SEO_006',
    check: (d) => !d.canonical || d.canonical === '',
    build: (d, ctx) => ({
      id: 'SEO_006', severity: 'low', category: 'seo',
      title: 'Canonical Tag مفقود',
      description: 'Canonical يحمي من مشكلة المحتوى المكرر عند وجود روابط متعددة للصفحة ذاتها.',
      monthlyLoss: Math.round(calculateLoss('missing_meta_desc', ctx) * 0.2),
      fixDifficulty: 1, fixTimeHours: 0.5,
      fixSteps: ['أضف <link rel="canonical" href="الرابط الأساسي للصفحة">', 'تأكد من أن كل صفحة منتج لها canonical خاص بها'],
      sources: ['Google Search Central - Canonical'],
    }),
  },
];
