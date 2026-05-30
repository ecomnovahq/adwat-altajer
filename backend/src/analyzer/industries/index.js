'use strict';

const profiles = {
  fashion: require('./fashion'),
  beauty:  require('./beauty'),
  electronics: require('./electronics'),
  food:    require('./food'),
  general: require('./general'),
};

const DETECT_PATTERNS = [
  [/ملابس|عباءة|ثياب|أزياء|fashion|abaya|hijab|مانطو|كوفرة/i,                        'fashion'],
  [/عطر|بخور|برفان|كريم|مكياج|perfume|fragrance|beauty|skincare|ميك أب/i,            'beauty'],
  [/جوال|موبايل|لابتوب|تلفاز|شاشة|phone|laptop|tv|electronic|كمبيوتر|سماعة|هاتف/i,  'electronics'],
  [/أكل|طعام|غذاء|منتجات طبيعية|food|organic|عضوي|تمر|قهوة|عسل|بقالة/i,             'food'],
];

function detectIndustryKey(signals) {
  const text = [signals.pageTitle, signals.metaDesc, ...(signals.h1s || [])].join(' ');
  for (const [pat, key] of DETECT_PATTERNS) {
    if (pat.test(text)) return key;
  }
  return 'general';
}

function getProfile(industryKey) {
  return profiles[industryKey] || profiles.general;
}

module.exports = { detectIndustryKey, getProfile };
