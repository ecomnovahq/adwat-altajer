'use strict';

module.exports = {
  key: 'electronics',
  nameAr: 'الإلكترونيات والتقنية',
  weights: {
    productImages: 0.12,
    trust: 0.18,
    checkout: 0.15,
    performance: 0.15,
    seo: 0.15,
    payment: 0.15,
    content: 0.10,
  },
  required: [
    { id: 'warranty',      label: 'معلومات الضمان واضحة',  critical: true },
    { id: 'specs',         label: 'مواصفات تقنية مفصّلة',  critical: true },
    { id: 'reviews',       label: 'تقييمات العملاء',        critical: true },
    { id: 'mada',          label: 'مدى مفعّل',              critical: true },
    { id: 'bnpl',          label: 'تابي أو تمارا',          critical: true },
    { id: 'return_policy', label: 'سياسة الإرجاع والاستبدال', critical: true },
  ],
  benchmarks: {
    avgScore: { p25: 52, p50: 70, p75: 82, p90: 92 },
    avgConversion: { p25: 0.006, p50: 0.014, p75: 0.026, p90: 0.044 },
    avgAOV: { p25: 350, p50: 650, p75: 1100, p90: 2200 },
  },
  industryTips: [
    'مقارنة المواصفات جنباً إلى جنب (Comparison Table) ترفع قرار الشراء بشكل ملحوظ',
    'فيديوهات الـ Unboxing من عملاء حقيقيين أفضل إعلان لمنتجات التقنية',
    'التقسيط (Tabby/Tamara) ضروري جداً للإلكترونيات — يُخفض حاجز السعر',
    'وضّح شروط الضمان والصيانة بوضوح تام — يُعطي ميزة تنافسية واضحة',
  ],
  seoKeywords: ['جوال', 'لابتوب', 'سماعة', 'شاشة', 'تلفاز'],
};
