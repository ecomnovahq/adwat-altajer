'use strict';

module.exports = {
  key: 'fashion',
  nameAr: 'الأزياء والملابس',
  weights: {
    productImages: 0.25,
    trust: 0.15,
    checkout: 0.15,
    performance: 0.10,
    seo: 0.10,
    payment: 0.15,
    content: 0.10,
  },
  required: [
    { id: 'size_guide',    label: 'دليل المقاسات',         critical: true },
    { id: 'product_video', label: 'فيديو المنتج',           critical: false },
    { id: 'reviews',       label: 'تقييمات العملاء',        critical: true },
    { id: 'return_policy', label: 'سياسة الإرجاع واضحة',   critical: true },
    { id: 'mada',          label: 'مدى مفعّل',              critical: true },
    { id: 'bnpl',          label: 'تابي أو تمارا',          critical: false },
  ],
  benchmarks: {
    avgScore: { p25: 45, p50: 62, p75: 75, p90: 88 },
    avgConversion: { p25: 0.008, p50: 0.018, p75: 0.032, p90: 0.055 },
    avgAOV: { p25: 180, p50: 280, p75: 420, p90: 680 },
  },
  industryTips: [
    'فيديوهات Try-On ترفع التحويل 35% في الأزياء — ابدأ بمنتجاتك الأكثر مبيعاً',
    'أضف "المقاس الموصى به" بناءً على الطول والوزن لتقليل المرتجعات',
    'صور المنتج على الجسم (Model Photos) أفضل بكثير من صور المانيكان المجرد',
    'عروض العيد والمناسبات السعودية تُضاعف المبيعات — استعد قبل شهر',
  ],
  seoKeywords: ['عباءة', 'ملابس', 'أزياء نسائية', 'فساتين', 'حجاب'],
};
