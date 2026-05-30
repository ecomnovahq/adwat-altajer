'use strict';

module.exports = {
  key: 'beauty',
  nameAr: 'العطور والجمال',
  weights: {
    productImages: 0.20,
    trust: 0.20,
    checkout: 0.12,
    performance: 0.10,
    seo: 0.12,
    payment: 0.14,
    content: 0.12,
  },
  required: [
    { id: 'reviews',       label: 'تقييمات العملاء',       critical: true },
    { id: 'ingredients',   label: 'قائمة المكونات واضحة',  critical: true },
    { id: 'before_after',  label: 'صور قبل وبعد',          critical: false },
    { id: 'return_policy', label: 'سياسة الإرجاع',         critical: true },
    { id: 'apple_pay',     label: 'Apple Pay',              critical: false },
    { id: 'bnpl',          label: 'تابي أو تمارا',         critical: false },
  ],
  benchmarks: {
    avgScore: { p25: 48, p50: 61, p75: 74, p90: 87 },
    avgConversion: { p25: 0.012, p50: 0.024, p75: 0.042, p90: 0.068 },
    avgAOV: { p25: 120, p50: 210, p75: 340, p90: 560 },
  },
  industryTips: [
    'محتوى "روتين العناية" (Skincare Routine) يزيد قيمة الطلب — اعرض منتجات متكاملة',
    'صور قبل/بعد الاستخدام من عملاء حقيقيين تُضاعف الثقة في العطور والكريمات',
    'وصف رائحة العطر بلغة حسية (دافئ، زهري، خشبي) يساعد على القرار عن بُعد',
    'حزم الهدايا (Gift Sets) في رمضان والعيد تُعطي AOV أعلى بـ 2×',
  ],
  seoKeywords: ['عطر', 'كريم', 'مكياج', 'سيروم', 'بخور'],
};
