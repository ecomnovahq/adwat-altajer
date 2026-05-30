'use strict';

module.exports = {
  key: 'general',
  nameAr: 'متجر عام',
  weights: {
    productImages: 0.18,
    trust: 0.16,
    checkout: 0.16,
    performance: 0.12,
    seo: 0.12,
    payment: 0.14,
    content: 0.12,
  },
  required: [
    { id: 'reviews',       label: 'تقييمات العملاء',       critical: true },
    { id: 'return_policy', label: 'سياسة الإرجاع',         critical: true },
    { id: 'mada',          label: 'مدى مفعّل',             critical: true },
    { id: 'apple_pay',     label: 'Apple Pay',              critical: false },
    { id: 'whatsapp',      label: 'WhatsApp للتواصل',       critical: false },
  ],
  benchmarks: {
    avgScore: { p25: 44, p50: 60, p75: 73, p90: 85 },
    avgConversion: { p25: 0.009, p50: 0.019, p75: 0.034, p90: 0.056 },
    avgAOV: { p25: 150, p50: 250, p75: 400, p90: 700 },
  },
  industryTips: [
    'أول 3 ثوانٍ تُحدد ما إذا سيبقى الزائر — وضّح ماذا تبيع فوراً في الهيدر',
    'WhatsApp هو قناة الدعم الأولى في السعودية — لا تُهمل الرد السريع',
    'صور المنتج عالية الجودة تُعوّض عن ضعف النصوص في كثير من الأحيان',
    'عرض "شحن مجاني" فوق مبلغ معين يرفع متوسط الطلب بشكل ملحوظ',
  ],
  seoKeywords: [],
};
