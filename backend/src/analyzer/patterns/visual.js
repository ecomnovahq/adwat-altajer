'use strict';

const { calculateLoss } = require('../revenue/calculator');

module.exports = [
  {
    id: 'VIS_001',
    check: (d) => !d.hasProductVideo,
    build: (d, ctx) => ({
      id: 'VIS_001', severity: 'high', category: 'visual',
      title: 'لا توجد فيديوهات للمنتجات',
      description: 'فيديوهات المنتج ترفع معدل التحويل 18-20% — خاصةً في الأزياء والجمال.',
      monthlyLoss: calculateLoss('no_product_video', ctx),
      fixDifficulty: 3, fixTimeHours: 12,
      fixSteps: ['صوّر فيديو 15-30 ثانية لكل منتج رئيسي', 'ضع الفيديو أول الصور في صفحة المنتج', 'استخدم فيديوهات UGC من العملاء إذا أمكن'],
      sources: ['Wyzowl Video Marketing Report 2024'],
    }),
  },
  {
    id: 'VIS_002',
    check: (d) => d.imgsMissingAlt > 0 && d.totalImgs > 0 && d.imgsMissingAlt / d.totalImgs > 0.3,
    build: (d, ctx) => ({
      id: 'VIS_002', severity: 'medium', category: 'visual',
      title: `${d.imgsMissingAlt} صورة بدون نص بديل (Alt)`,
      description: 'نص Alt يساعد Google على فهم الصور ويحسن ترتيب المتجر في نتائج البحث.',
      monthlyLoss: Math.round(calculateLoss('missing_meta_desc', ctx) * 0.5),
      fixDifficulty: 2, fixTimeHours: 3,
      fixSteps: ['أضف وصفاً لكل صورة يتضمن اسم المنتج والفئة', 'مثال: "عباءة سوداء فاخرة للمرأة"', 'سلة: استخدم حقل Alt في إعدادات المنتج'],
      sources: ['Google Search Central - Image SEO'],
    }),
  },
  {
    id: 'VIS_003',
    check: (d) => !d.hasStructuredData,
    build: (d, ctx) => ({
      id: 'VIS_003', severity: 'medium', category: 'visual',
      title: 'لا توجد بيانات منظمة (Structured Data)',
      description: 'البيانات المنظمة تُظهر السعر والتقييمات مباشرةً في نتائج Google — ترفع نسبة النقر 30%.',
      monthlyLoss: Math.round(calculateLoss('missing_meta_desc', ctx) * 0.8),
      fixDifficulty: 2, fixTimeHours: 4,
      fixSteps: ['سلة/زد: تفعيل بيانات المنتج المنظمة من لوحة التحكم', 'أو أضف Product Schema يدوياً في قالب المنتج'],
      sources: ['Google Rich Results Test Documentation'],
    }),
  },
  {
    id: 'VIS_004',
    check: (d) => !d.hasOGImage,
    build: (d, ctx) => ({
      id: 'VIS_004', severity: 'low', category: 'visual',
      title: 'Open Graph Image غير محدد',
      description: 'بدونه، مشاركة المتجر على سوشيال تُظهر صورة عشوائية أو بدون صورة.',
      monthlyLoss: Math.round(calculateLoss('missing_meta_desc', ctx) * 0.3),
      fixDifficulty: 1, fixTimeHours: 0.5,
      fixSteps: ['أضف meta og:image بصورة المتجر الرئيسية (1200×630 بكسل)', 'استخدم صورة عالية الجودة تعبّر عن هوية المتجر'],
      sources: ['Open Graph Protocol Specification'],
    }),
  },
  {
    id: 'VIS_005',
    check: (d) => d.lang && d.lang !== 'ar' && d.lang !== 'ar-SA',
    build: (d, ctx) => ({
      id: 'VIS_005', severity: 'medium', category: 'visual',
      title: 'لغة الصفحة غير محددة بالعربية',
      description: 'خاصية lang="ar" تُخبر المتصفحات والقارئات بأن المحتوى عربي — تحسين للـ SEO والـ UX.',
      monthlyLoss: Math.round(calculateLoss('missing_meta_desc', ctx) * 0.2),
      fixDifficulty: 1, fixTimeHours: 0.5,
      fixSteps: ['أضف lang="ar" أو lang="ar-SA" لعنصر <html>', 'تأكد من dir="rtl" أيضاً'],
      sources: ['W3C Internationalization Guide'],
    }),
  },
  {
    id: 'VIS_006',
    check: (d) => !d.themeColor,
    build: (d, ctx) => ({
      id: 'VIS_006', severity: 'low', category: 'visual',
      title: 'لون المتجر غير محدد (Theme Color)',
      description: 'theme-color يُلوّن شريط المتصفح على Android — يُحسّن التجربة البصرية.',
      monthlyLoss: 0,
      fixDifficulty: 1, fixTimeHours: 0.25,
      fixSteps: ['أضف <meta name="theme-color" content="#[لون_علامتك_التجارية]">', 'اختر اللون الأساسي لمتجرك'],
      sources: ['Google Web App Manifest Guide'],
    }),
  },
];
