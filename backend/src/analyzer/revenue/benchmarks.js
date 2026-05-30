'use strict';

// Saudi market e-commerce benchmarks (2024-2025)
// Sources: SAMA payment reports, STC Pay data, Salla/Zid merchant analytics

const CONVERSION_RATES = {
  fashion:     { p25: 0.008, p50: 0.018, p75: 0.032, p90: 0.055 },
  beauty:      { p25: 0.012, p50: 0.024, p75: 0.042, p90: 0.068 },
  electronics: { p25: 0.006, p50: 0.014, p75: 0.026, p90: 0.044 },
  food:        { p25: 0.018, p50: 0.038, p75: 0.062, p90: 0.095 },
  general:     { p25: 0.009, p50: 0.019, p75: 0.034, p90: 0.056 },
};

const AOV_SAR = {
  fashion:     { p25: 180, p50: 280, p75: 420, p90: 680 },
  beauty:      { p25: 120, p50: 210, p75: 340, p90: 560 },
  electronics: { p25: 350, p50: 650, p75: 1100, p90: 2200 },
  food:        { p25: 80,  p50: 140, p75: 220, p90: 380 },
  general:     { p25: 150, p50: 250, p75: 400, p90: 700 },
};

// Monthly visitors by store size (estimated from Salla merchant data)
const VISITOR_TIERS = {
  micro:      { products: [1, 20],   visitors: 800 },
  small:      { products: [21, 100], visitors: 3500 },
  medium:     { products: [101, 500],visitors: 12000 },
  large:      { products: [501, 2000],visitors: 45000 },
  enterprise: { products: [2001, Infinity], visitors: 150000 },
};

// Conversion impact rates per issue type (% of orders lost)
const IMPACT_RATES = {
  no_apple_pay:        0.12,  // Apple Pay penetration in KSA: 12% of transactions
  no_mada:             0.35,  // Mada is dominant: 35% of online payments
  no_bnpl:             0.28,  // Tabby/Tamara: 28% usage for fashion/beauty
  no_stc_pay:          0.08,
  slow_loading:        0.07,  // per extra second above 3s: -7% conversions
  no_reviews:          0.18,
  no_product_video:    0.18,  // video increases conversion 18-20%
  no_whatsapp:         0.14,
  no_trust_badges:     0.10,
  poor_mobile:         0.22,  // 78% of KSA traffic is mobile
  no_free_shipping:    0.25,
  no_return_policy:    0.16,
  no_size_guide:       0.12,  // fashion only
  missing_meta_desc:   0.08,  // SEO traffic loss
};

module.exports = { CONVERSION_RATES, AOV_SAR, VISITOR_TIERS, IMPACT_RATES };
