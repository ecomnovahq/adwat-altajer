'use strict';

const { calculateLoss } = require('../revenue/calculator');

module.exports = [
  {
    id: 'CHK_001',
    check: (d) => !d.hasCart,
    build: (d, ctx) => ({
      id: 'CHK_001', severity: 'critical', category: 'checkout',
      title: 'سلة التسوق غير مكتشفة',
      description: 'عدم وجود سلة واضحة يمنع المستخدم من إكمال الشراء.',
      monthlyLoss: Math.round((ctx.visitors || 1000) * 0.019 * (ctx.aov || 250) * 0.8),
      fixDifficulty: 2, fixTimeHours: 4,
      fixSteps: ['تأكد من وجود أيقونة سلة واضحة في الهيدر', 'اعرض عدد المنتجات في السلة', 'فعّل Mini Cart (سلة منبثقة)'],
      sources: ['Baymard Institute Cart UX Research'],
    }),
  },
  {
    id: 'CHK_002',
    check: (d) => !d.hasAddToCartBtn,
    build: (d, ctx) => ({
      id: 'CHK_002', severity: 'critical', category: 'checkout',
      title: 'زر "إضافة للسلة" غير واضح',
      description: 'الزر الأساسي للشراء غير مكتشف — أكبر عائق للتحويل المحتمل.',
      monthlyLoss: Math.round((ctx.visitors || 1000) * 0.019 * (ctx.aov || 250) * 0.6),
      fixDifficulty: 2, fixTimeHours: 3,
      fixSteps: ['اجعل زر "إضافة للسلة" بلون مميز وحجم كبير', 'استخدم نص واضح: "أضف للسلة" أو "اشترِ الآن"', 'تأكد من ظهوره بدون تمرير على الجوال'],
      sources: ['Baymard Institute Product Page UX'],
    }),
  },
  {
    id: 'CHK_003',
    check: (d) => !d.hasUrgencyText && !d.hasCountdown,
    build: (d, ctx) => ({
      id: 'CHK_003', severity: 'medium', category: 'checkout',
      title: 'لا توجد عناصر إلحاح (Urgency)',
      description: 'عناصر الإلحاح (عروض محدودة، عداد تنازلي) ترفع التحويل 15-20%.',
      monthlyLoss: Math.round((ctx.visitors || 1000) * 0.019 * (ctx.aov || 250) * 0.15),
      fixDifficulty: 2, fixTimeHours: 3,
      fixSteps: ['أضف "باقي X قطعة" لصفحات المنتجات', 'فعّل عداد تنازلي للعروض المؤقتة', 'استخدم: "العرض ينتهي بعد 24 ساعة"'],
      sources: ['Cialdini Principles of Persuasion', 'Nosto E-commerce UX Research'],
    }),
  },
  {
    id: 'CHK_004',
    check: (d) => !d.hasSearch,
    build: (d, ctx) => ({
      id: 'CHK_004', severity: 'high', category: 'checkout',
      title: 'لا يوجد بحث داخلي',
      description: 'الزوار الذين يستخدمون البحث يشترون بمعدل 2-3× أعلى من غيرهم.',
      monthlyLoss: Math.round((ctx.visitors || 1000) * 0.019 * (ctx.aov || 250) * 0.25),
      fixDifficulty: 2, fixTimeHours: 3,
      fixSteps: ['فعّل البحث الداخلي من إعدادات المتجر', 'أضف بحثاً فورياً (Instant Search) للنتائج السريعة'],
      sources: ['Econsultancy Search UX Report'],
    }),
  },
  {
    id: 'CHK_005',
    check: (d) => !d.hasWishlist,
    build: (d, ctx) => ({
      id: 'CHK_005', severity: 'low', category: 'checkout',
      title: 'لا توجد قائمة مفضلة (Wishlist)',
      description: 'المفضلة تُعيد الزوار للمتجر — 35% من العائدين يُكملون الشراء.',
      monthlyLoss: Math.round((ctx.visitors || 1000) * 0.019 * (ctx.aov || 250) * 0.08),
      fixDifficulty: 2, fixTimeHours: 3,
      fixSteps: ['فعّل المفضلة من إعدادات المتجر (سلة/زد)', 'أرسل تذكيراً بالبريد أو WhatsApp للمنتجات المحفوظة'],
      sources: ['Salesforce Commerce Cloud Wishlist Research'],
    }),
  },
  {
    id: 'CHK_006',
    check: (d) => !d.hasMobileMenu,
    build: (d, ctx) => ({
      id: 'CHK_006', severity: 'high', category: 'checkout',
      title: 'قائمة الجوال غير مكتشفة',
      description: '78% من زوار المتاجر السعودية يتصفحون عبر الجوال — ضعف تجربة الجوال يُهدر معظم الزيارات.',
      monthlyLoss: calculateLoss('poor_mobile', ctx),
      fixDifficulty: 2, fixTimeHours: 4,
      fixSteps: ['تأكد من وجود Hamburger Menu واضح على الجوال', 'اختبر تجربة التصفح من جهاز جوال حقيقي', 'تأكد من أن القوائم والفلاتر سهلة اللمس (44px minimum)'],
      sources: ['Statista KSA Mobile Commerce Report 2024'],
    }),
  },
];
