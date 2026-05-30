'use strict';

module.exports = {
  key: 'food',
  nameAr: 'المواد الغذائية',
  weights: {
    productImages: 0.20,
    trust: 0.18,
    checkout: 0.18,
    performance: 0.12,
    seo: 0.10,
    payment: 0.12,
    content: 0.10,
  },
  required: [
    { id: 'ingredients',    label: 'قائمة المكونات',              critical: true },
    { id: 'expiry',         label: 'تاريخ الصلاحية أو العمر الافتراضي', critical: true },
    { id: 'shipping_info',  label: 'معلومات الشحن المبرّد',       critical: false },
    { id: 'certifications', label: 'شهادات الجودة (SFDA/حلال)',   critical: true },
    { id: 'mada',           label: 'مدى مفعّل',                   critical: true },
    { id: 'reviews',        label: 'تقييمات العملاء',             critical: true },
  ],
  benchmarks: {
    avgScore: { p25: 42, p50: 55, p75: 68, p90: 82 },
    avgConversion: { p25: 0.018, p50: 0.038, p75: 0.062, p90: 0.095 },
    avgAOV: { p25: 80, p50: 140, p75: 220, p90: 380 },
  },
  industryTips: [
    'شهادة SFDA أو "مُعتمد حلال" بارزة في صفحة المنتج تزيد الثقة بشكل كبير',
    'صور "farm to table" والمصدر الطبيعي تُقنع المتسوق السعودي أكثر من الأسعار',
    'اعرض وقت الشحن بوضوح — العميل يريد معرفة متى يصل طعامه',
    'حزم الاشتراك الشهري (Subscription) للمنتجات المتكررة تُعطي دخلاً ثابتاً',
  ],
  seoKeywords: ['عسل', 'تمر', 'قهوة', 'زيت أرغان', 'منتجات طبيعية'],
};
