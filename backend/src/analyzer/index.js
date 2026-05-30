'use strict';

// v5 Orchestrator — 3-layer architecture
// Layer 1: Data collectors (parallel, no AI)
// Layer 2: Pattern recognition (no AI, instant)
// Layer 3: AI reasoning (3 calls instead of 6)

const { runPatterns } = require('./patterns');
const { estimateMonthlyVisitors, calculateTotalLoss } = require('./revenue/calculator');
const { getProfile, detectIndustryKey } = require('./industries');
const { saveSnapshot, compareSnapshots, getActions } = require('./snapshots');
const crypto = require('crypto');

function buildV5Context(scraped, seoFiles, pageSpeed, security, industry) {
  const iKey = detectIndustryKey(scraped);
  const profile = getProfile(industry ? iKey : iKey);
  const visitors = estimateMonthlyVisitors({
    productCount: scraped.productCount,
    hasReviewSection: scraped.hasReviewSection,
    hasSocialLinks: Object.keys(scraped.socialLinks || {}).length > 0,
  });
  return {
    industryKey: iKey,
    industryProfile: profile,
    visitors,
    aov: profile.benchmarks.avgAOV.p50,
    industry,
    lcp: pageSpeed.lcp,
    performanceScore: pageSpeed.performanceScore,
    securityScore: security.score,
    ...scraped,
    ...seoFiles,
  };
}

async function runV5Analysis({ scraped, seoFiles, pageSpeed, screenshots, security, userId, storeUrl, category }) {
  const ctx = buildV5Context(
    scraped.success ? scraped : {},
    seoFiles,
    pageSpeed,
    security,
    category
  );

  // Layer 2: patterns
  const patternIssues = runPatterns(ctx, ctx);
  const totalLoss = calculateTotalLoss(patternIssues, ctx);

  // Snapshot comparison
  const [snapshotComparison, previousActions] = await Promise.all([
    compareSnapshots(userId, storeUrl),
    getActions(userId, storeUrl),
  ]);

  // Annotate patterns with previous action statuses
  const actionMap = {};
  for (const a of previousActions) actionMap[a.issue_id] = a.status;
  const annotatedIssues = patternIssues.map(i => ({
    ...i,
    actionStatus: actionMap[i.id] || 'suggested',
  }));

  // Top 3 actions: exclude done + dismissed (last 30 days)
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const topActions = annotatedIssues
    .filter(i => {
      if (i.actionStatus === 'done') return false;
      if (i.actionStatus === 'dismissed') return false;
      return true;
    })
    .slice(0, 3);

  return {
    // 3 core questions
    estimatedVisitors: ctx.visitors,
    totalMonthlyLoss: totalLoss.totalMonthly,
    totalYearlyLoss: totalLoss.totalYearly,
    // Actions sorted by ROI
    patternIssues: annotatedIssues,
    topActions,
    // Industry
    industryKey: ctx.industryKey,
    industryTips: ctx.industryProfile.industryTips,
    industryRequired: ctx.industryProfile.required,
    // History
    snapshotComparison,
    previousActions,
  };
}

module.exports = { runV5Analysis };
