'use strict';

const { calculateLoss } = require('../revenue/calculator');

module.exports = [
  {
    id: 'TRUST_001',
    check: (d) => !d.hasReviewSection,
    build: (d, ctx) => ({
      id: 'TRUST_001', severity: 'high', category: 'trust',
      title: 'لا توجد تقييمات للمنتجات',
      description: '88% من المستهلكين يقرأون التقييمات قبل الشراء — غيابها يُفقد الثقة الفورية.',
      monthlyLoss: calculateLoss('no_reviews', ctx),
      fixDifficulty: 2, fixTimeHours: 3,
      fixSteps: ['فعّل نظام التقييمات في إعدادات المتجر', 'أرسل رسالة WhatsApp للمشترين السابقين تطلب تقييماً', 'عرض كوبون خصم مقابل تقييم صادق'],
      sources: ['BrightLocal Consumer Survey 2024', 'Salla Merchant Best Practices'],
    }),
  },
  {
    id: 'TRUST_002',
    check: (d) => !d.hasReturnPolicy,
    build: (d, ctx) => ({
      id: 'TRUST_002', severity: 'high', category: 'trust',
      title: 'سياسة الإرجاع غير واضحة',
      description: '67% من المتسوقين يتحققون من سياسة الإرجاع قبل الشراء. غيابها يزيد التردد.',
      monthlyLoss: calculateLoss('no_return_policy', ctx),
      fixDifficulty: 1, fixTimeHours: 1,
      fixSteps: ['أضف صفحة "سياسة الإرجاع والاستبدال"', 'اذكرها بوضوح في صفحة المنتج وصفحة الدفع', 'حدد المدة (7 أيام، 30 يوم) بوضوح'],
      sources: ['Narvar Consumer Study 2024'],
    }),
  },
  {
    id: 'TRUST_003',
    check: (d) => !d.hasTrustBadges,
    build: (d, ctx) => ({
      id: 'TRUST_003', severity: 'medium', category: 'trust',
      title: 'لا توجد شارات ثقة',
      description: 'شارات "شحن سريع", "دفع آمن", "ضمان" تزيد التحويل 10-15%.',
      monthlyLoss: calculateLoss('no_trust_badges', ctx),
      fixDifficulty: 1, fixTimeHours: 1,
      fixSteps: ['أضف شارات: دفع آمن، شحن سريع، ضمان الجودة', 'ضعها بالقرب من زر "إضافة للسلة"', 'استخدم أيقونات واضحة بنص عربي'],
      sources: ['Baymard Institute Trust Indicators Research'],
    }),
  },
  {
    id: 'TRUST_004',
    check: (d) => !d.hasWhatsAppFloat,
    build: (d, ctx) => ({
      id: 'TRUST_004', severity: 'high', category: 'trust',
      title: 'لا يوجد زر WhatsApp للتواصل',
      description: 'WhatsApp هو قناة التواصل الأولى في السعودية — غيابه يُقلل الثقة ويفقد العملاء المترددين.',
      monthlyLoss: calculateLoss('no_whatsapp', ctx),
      fixDifficulty: 1, fixTimeHours: 0.5,
      fixSteps: ['أضف زر WhatsApp عائم (Floating Button)', 'ضع رسالة استقبال جاهزة', 'فعّل الرد التلقائي في WhatsApp Business'],
      sources: ['Meta Business Messaging Report 2024'],
    }),
  },
  {
    id: 'TRUST_005',
    check: (d) => !d.hasShippingBadge,
    build: (d, ctx) => ({
      id: 'TRUST_005', severity: 'medium', category: 'trust',
      title: 'معلومات الشحن غير بارزة',
      description: '25% من المتسوقين يتخلون عن السلة عند اكتشاف تكلفة الشحن متأخرة.',
      monthlyLoss: calculateLoss('no_free_shipping', ctx),
      fixDifficulty: 1, fixTimeHours: 1,
      fixSteps: ['اعرض تكلفة الشحن أو "شحن مجاني" في صفحة المنتج', 'أضف شريط إعلاني علوي يذكر عتبة الشحن المجاني', 'مثال: "شحن مجاني للطلبات فوق 200 ريال"'],
      sources: ['Baymard Checkout Abandonment Study 2024'],
    }),
  },
  {
    id: 'TRUST_006',
    check: (d) => !d.hasChatWidget && !d.hasWhatsAppFloat,
    build: (d, ctx) => ({
      id: 'TRUST_006', severity: 'medium', category: 'trust',
      title: 'لا يوجد دعم فوري للعملاء',
      description: 'المتاجر التي تقدم دعماً فورياً تحقق معدل تحويل أعلى بـ 14% من تلك التي لا تقدمه.',
      monthlyLoss: Math.round(calculateLoss('no_whatsapp', ctx) * 0.6),
      fixDifficulty: 1, fixTimeHours: 1,
      fixSteps: ['أضف Tidio أو Intercom (مجاني للبداية)', 'أو ربط WhatsApp Business كبديل سهل'],
      sources: ['Drift Conversational Commerce Report'],
    }),
  },
];
