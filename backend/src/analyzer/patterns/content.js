'use strict';

const { calculateLoss } = require('../revenue/calculator');

module.exports = [
  {
    id: 'CONT_001',
    check: (d) => !d.hasSizeGuide && /fashion|ملابس|أزياء|عباء/.test((d.detectedIndustry || '').toLowerCase()),
    build: (d, ctx) => ({
      id: 'CONT_001', severity: 'high', category: 'content',
      title: 'دليل المقاسات غير موجود (ضروري للأزياء)',
      description: '12% من مشتري الملابس يتراجعون عند غياب دليل المقاسات.',
      monthlyLoss: calculateLoss('no_size_guide', ctx),
      fixDifficulty: 1, fixTimeHours: 2,
      fixSteps: ['أضف صفحة دليل مقاسات بصورة توضيحية', 'اربطها من صفحة كل منتج ملابس', 'أضف ملاحظة: "هل أنت بين مقاسين؟ خذ الأكبر"'],
      sources: ['Zalando Returns Analysis 2024'],
    }),
  },
  {
    id: 'CONT_002',
    check: (d) => !d.technologies?.includes('Facebook Pixel') && !d.technologies?.includes('TikTok Pixel') && !d.technologies?.includes('Snapchat Pixel'),
    build: (d, ctx) => ({
      id: 'CONT_002', severity: 'high', category: 'content',
      title: 'لا يوجد بكسل إعلاني',
      description: 'بدون البكسل لا تستطيع استهداف العملاء السابقين ولا قياس عائد الإعلانات.',
      monthlyLoss: 0,
      fixDifficulty: 2, fixTimeHours: 2,
      fixSteps: ['ثبّت Meta Pixel (Facebook/Instagram) أولاً', 'أضف TikTok Pixel إذا كانت جمهورك شباب', 'استخدم Google Tag Manager لإدارتهم معاً'],
      sources: ['Meta Business Manager Setup Guide'],
    }),
  },
  {
    id: 'CONT_003',
    check: (d) => !d.pageTitle || d.pageTitle.length < 20,
    build: (d, ctx) => ({
      id: 'CONT_003', severity: 'medium', category: 'content',
      title: 'عنوان الصفحة قصير أو غير وصفي',
      description: 'العنوان يظهر في نتائج Google وتبويبات المتصفح — يؤثر مباشرة على نسبة النقر.',
      monthlyLoss: Math.round(calculateLoss('missing_meta_desc', ctx) * 0.6),
      fixDifficulty: 1, fixTimeHours: 0.5,
      fixSteps: ['اجعل العنوان بين 50-60 حرفاً', 'اتبع هيكل: "اسم المتجر | فئة المنتج الرئيسية"', 'مثال: "متجر نور | عباءات وأزياء نسائية فاخرة"'],
      sources: ['Moz Title Tag Guide'],
    }),
  },
  {
    id: 'CONT_004',
    check: (d) => Object.keys(d.socialLinks || {}).length === 0,
    build: (d, ctx) => ({
      id: 'CONT_004', severity: 'medium', category: 'content',
      title: 'لا توجد روابط سوشيال ميديا',
      description: 'روابط السوشيال تبني الثقة وتُتيح متابعة العملاء خارج الموقع.',
      monthlyLoss: Math.round(calculateLoss('no_trust_badges', ctx) * 0.3),
      fixDifficulty: 1, fixTimeHours: 0.5,
      fixSteps: ['أضف روابط Instagram, TikTok, Twitter/X في الفوتر', 'تأكد من أن الأيقونات تُفتح في تبويب جديد'],
      sources: ['Sprout Social Commerce Study 2024'],
    }),
  },
  {
    id: 'CONT_005',
    check: (d) => !d.technologies?.includes('Hotjar') && !d.technologies?.includes('Microsoft Clarity'),
    build: (d, ctx) => ({
      id: 'CONT_005', severity: 'low', category: 'content',
      title: 'لا توجد أداة تحليل سلوك الزوار',
      description: 'Heatmaps تُريك أين يضغط الزوار وأين يتوقفون — بيانات ثمينة لتحسين التحويل.',
      monthlyLoss: 0,
      fixDifficulty: 1, fixTimeHours: 1,
      fixSteps: ['ثبّت Microsoft Clarity (مجاني تماماً)', 'أو Hotjar (خطة مجانية متاحة)', 'راجع التسجيلات أسبوعياً لاكتشاف المشكلات'],
      sources: ['Microsoft Clarity Documentation'],
    }),
  },
  {
    id: 'CONT_006',
    check: (d) => d.securityScore !== undefined && d.securityScore < 50,
    build: (d, ctx) => ({
      id: 'CONT_006', severity: 'medium', category: 'content',
      title: `رؤوس الأمان ضعيفة (Security Headers: ${d.securityScore || 0}/100)`,
      description: 'رؤوس الأمان المفقودة تُعرّض المتجر لهجمات XSS وتُضعف ثقة المتصفحات.',
      monthlyLoss: 0,
      fixDifficulty: 2, fixTimeHours: 2,
      fixSteps: ['فعّل HSTS على الخادم', 'أضف Content-Security-Policy', 'استخدم Cloudflare لإضافة معظم الرؤوس تلقائياً'],
      sources: ['OWASP Security Headers Project'],
    }),
  },
];
