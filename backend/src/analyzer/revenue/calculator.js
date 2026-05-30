'use strict';

const { CONVERSION_RATES, AOV_SAR, VISITOR_TIERS, IMPACT_RATES } = require('./benchmarks');

function _industryKey(industry) {
  if (!industry) return 'general';
  const i = industry.toLowerCase();
  if (/ملابس|أزياء|fashion|abaya/.test(i))       return 'fashion';
  if (/عطور|جمال|beauty|skincare/.test(i))        return 'beauty';
  if (/إلكترون|جوال|لابتوب|electronic/.test(i))  return 'electronics';
  if (/غذائ|أكل|food|organic/.test(i))            return 'food';
  return 'general';
}

function _visitorTier(productCount) {
  const count = productCount || 0;
  for (const [, tier] of Object.entries(VISITOR_TIERS)) {
    if (count >= tier.products[0] && count <= tier.products[1]) return tier.visitors;
  }
  return VISITOR_TIERS.small.visitors;
}

function estimateMonthlyVisitors(signals) {
  const { productCount = 0, hasReviewSection, hasSocialLinks, themeQuality = 0.5 } = signals || {};
  let base = _visitorTier(productCount);
  if (hasReviewSection) base *= 1.15;
  if (hasSocialLinks)   base *= 1.10;
  base *= (0.8 + themeQuality * 0.4);
  return Math.round(base);
}

function calculateLoss(issueType, { visitors, aov, industry }) {
  const rate = IMPACT_RATES[issueType];
  if (!rate) return 0;
  const iKey = _industryKey(industry);
  const cr = CONVERSION_RATES[iKey]?.p50 || 0.019;
  const baseAov = aov || AOV_SAR[iKey]?.p50 || 250;
  const monthlyOrders = visitors * cr;
  return Math.round(monthlyOrders * rate * baseAov);
}

function calculateTotalLoss(issues, context) {
  const { visitors, industry } = context || {};
  const iKey = _industryKey(industry);
  const aov = AOV_SAR[iKey]?.p50 || 250;
  let totalMonthly = 0;
  const byIssue = {};
  for (const issue of (issues || [])) {
    const loss = calculateLoss(issue.issueType || issue.id, { visitors, aov, industry });
    byIssue[issue.id || issue.issueType] = loss;
    totalMonthly += loss;
  }
  return { totalMonthly, totalYearly: totalMonthly * 12, byIssue };
}

module.exports = { estimateMonthlyVisitors, calculateLoss, calculateTotalLoss };
