'use strict';

const { calculateLoss } = require('../revenue/calculator');

module.exports = [
  {
    id: 'PAY_001',
    check: (d) => !d.paymentMethods?.some(p => /apple/i.test(p)),
    build: (d, ctx) => ({
      id: 'PAY_001', severity: 'high', category: 'payment',
      title: 'Apple Pay غير مفعّل',
      description: '12% من المتسوقين السعوديين يفضلون Apple Pay — غيابه يُعيق إتمام الشراء.',
      monthlyLoss: calculateLoss('no_apple_pay', ctx),
      fixDifficulty: 1, fixTimeHours: 1,
      fixSteps: ['اذهب إلى إعدادات المتجر → طرق الدفع', 'فعّل Apple Pay من قائمة البوابات المتاحة', 'اختبر عملية الدفع من جهاز iPhone'],
      sources: ['SAMA Payment Report 2024', 'Salla Merchant Analytics'],
    }),
  },
  {
    id: 'PAY_002',
    check: (d) => !d.paymentMethods?.some(p => /مدى|mada/i.test(p)),
    build: (d, ctx) => ({
      id: 'PAY_002', severity: 'critical', category: 'payment',
      title: 'مدى غير مفعّل',
      description: 'مدى هي بطاقة الدفع الأكثر انتشاراً في السعودية — غيابها يخسّرك 35% من المتسوقين.',
      monthlyLoss: calculateLoss('no_mada', ctx),
      fixDifficulty: 1, fixTimeHours: 1,
      fixSteps: ['تواصل مع بوابة الدفع (HyperPay, Moyasar, Payfort)', 'فعّل قبول بطاقات مدى', 'تأكد من ظهور شعار مدى في صفحة الدفع'],
      sources: ['SAMA Payment Report 2024'],
    }),
  },
  {
    id: 'PAY_003',
    check: (d) => !d.paymentMethods?.some(p => /tabby|tamara|تابي|تمارا|buy.?now.?pay.?later|bnpl/i.test(p)),
    build: (d, ctx) => ({
      id: 'PAY_003', severity: 'high', category: 'payment',
      title: 'التقسيط (Tabby/Tamara) غير متاح',
      description: '28% من المتسوقين يستخدمون BNPL للمشتريات فوق 200 ريال.',
      monthlyLoss: calculateLoss('no_bnpl', ctx),
      fixDifficulty: 2, fixTimeHours: 4,
      fixSteps: ['سجّل في Tabby أو Tamara (مجاناً)', 'ثبّت التطبيق على متجرك', 'أضف شعار التقسيط في صفحة المنتج'],
      sources: ['Tabby Merchant Report 2024', 'Tamara Market Study'],
    }),
  },
  {
    id: 'PAY_004',
    check: (d) => !d.paymentMethods?.some(p => /stc.?pay|اس تي سي/i.test(p)),
    build: (d, ctx) => ({
      id: 'PAY_004', severity: 'medium', category: 'payment',
      title: 'STC Pay غير مفعّل',
      description: 'STC Pay يُستخدم بنسبة 8% من المدفوعات الرقمية في السعودية.',
      monthlyLoss: calculateLoss('no_stc_pay', ctx),
      fixDifficulty: 2, fixTimeHours: 3,
      fixSteps: ['انتسب لشراكة STC Pay للتجار', 'ادمج API أو استخدم موحد مدفوعات يدعمه', 'اختبر معاملة تجريبية'],
      sources: ['STC Pay Merchant Program 2024'],
    }),
  },
  {
    id: 'PAY_005',
    check: (d) => !d.hasPaymentBadgesInFooter,
    build: (d, ctx) => ({
      id: 'PAY_005', severity: 'medium', category: 'payment',
      title: 'شعارات طرق الدفع غير ظاهرة',
      description: 'عدم رؤية الزائر لطرق الدفع يخلق قلقاً يُقلل الثقة بنسبة 10%.',
      monthlyLoss: Math.round(calculateLoss('no_trust_badges', ctx) * 0.4),
      fixDifficulty: 1, fixTimeHours: 0.5,
      fixSteps: ['أضف صور شعارات مدى، Visa، Mastercard، Apple Pay في الفوتر', 'استخدم حجم 40-60px للوضوح على الجوال'],
      sources: ['Baymard Institute UX Research'],
    }),
  },
  {
    id: 'PAY_006',
    check: (d) => d.checkoutSteps > 4,
    build: (d, ctx) => ({
      id: 'PAY_006', severity: 'high', category: 'payment',
      title: 'خطوات الدفع كثيرة',
      description: 'كل خطوة إضافية في الـ checkout تُسقط 20% من المتسوقين.',
      monthlyLoss: Math.round((ctx.visitors || 1000) * 0.019 * (ctx.aov || 250) * 0.2),
      fixDifficulty: 3, fixTimeHours: 8,
      fixSteps: ['فعّل Express Checkout (شراء بنقرة واحدة)', 'اجمع عنوان الشحن ومعلومات الدفع في صفحة واحدة', 'خفّض الحقول المطلوبة لأقل من 8 حقول'],
      sources: ['Baymard Institute 2024 Checkout Study'],
    }),
  },
];
