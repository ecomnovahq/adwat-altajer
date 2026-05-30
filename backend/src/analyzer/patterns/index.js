'use strict';

const paymentPatterns     = require('./payment');
const performancePatterns = require('./performance');
const trustPatterns       = require('./trust');
const visualPatterns      = require('./visual');
const seoPatterns         = require('./seo');
const checkoutPatterns    = require('./checkout');
const contentPatterns     = require('./content');

const ALL_PATTERNS = [
  ...paymentPatterns,
  ...performancePatterns,
  ...trustPatterns,
  ...visualPatterns,
  ...seoPatterns,
  ...checkoutPatterns,
  ...contentPatterns,
];

function prioritizeByROI(issues) {
  return issues
    .filter(i => i.monthlyLoss > 0 || i.severity === 'critical')
    .sort((a, b) => {
      const roiA = (a.monthlyLoss || 0) / Math.max(a.fixDifficulty || 1, 1);
      const roiB = (b.monthlyLoss || 0) / Math.max(b.fixDifficulty || 1, 1);
      return roiB - roiA;
    });
}

function runPatterns(data, context) {
  const issues = [];
  for (const pattern of ALL_PATTERNS) {
    try {
      if (pattern.check(data)) {
        issues.push(pattern.build(data, context));
      }
    } catch { /* skip failed pattern */ }
  }
  return prioritizeByROI(issues);
}

module.exports = { runPatterns, prioritizeByROI };
