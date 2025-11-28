/**
 * Monthly Limit Middleware
 * Tracks and resets monthly scan limits based on user tier
 */

const User = require('../models/User');

/**
 * Get tier-based scan limit
 */
function getTierLimit(user) {
  if (!user) return 3; // Free tier default
  
  const now = new Date();
  const isActivePremium = user.isPremium && 
    (!user.premiumExpiresAt || user.premiumExpiresAt > now);
  
  // If user has isPremium flag but tier is 'free', treat as professional (migration case)
  if (isActivePremium && user.tier === 'free') {
    return 200; // Professional tier limit
  }
  
  switch (user.tier) {
    case 'starter':
      return 50;
    case 'professional':
      return 200;
    case 'free':
    default:
      return 3; // Lifetime limit for free tier
  }
}

/**
 * Check and reset monthly limits if needed
 */
async function checkMonthlyLimit(user) {
  if (!user) return { allowed: true, scansUsed: 0, maxScans: 0 };
  
  const now = new Date();
  const lastReset = user.lastMonthReset || user.createdAt;
  const maxScans = getTierLimit(user);
  const isFreeTier = user.tier === 'free';
  
  // Free tier: lifetime limit (no monthly reset)
  // Paid tiers: monthly limit (resets monthly)
  if (!isFreeTier) {
    // Check if we need to reset (new month)
    const needsReset = 
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear();
    
    if (needsReset) {
      user.monthlyScansUsed = 0;
      user.lastMonthReset = now;
      await user.save();
    }
  }
  
  // Check if user has active premium subscription
  const isPremium = user.isPremium && 
    (!user.premiumExpiresAt || user.premiumExpiresAt > now) &&
    user.tier !== 'free';
  
  // Free tier uses attemptsUsed (lifetime), paid tiers use monthlyScansUsed
  const scansUsed = isFreeTier ? user.attemptsUsed : user.monthlyScansUsed;
  
  return {
    allowed: scansUsed < maxScans,
    scansUsed,
    maxScans,
    isPremium,
    isFreeTier,
    resetDate: user.lastMonthReset
  };
}

/**
 * Increment monthly scan count
 */
async function incrementMonthlyScan(user) {
  if (!user) return;
  
  const now = new Date();
  const isPremium = user.isPremium && 
    (!user.premiumExpiresAt || user.premiumExpiresAt > now) &&
    user.tier !== 'free';
  
  // Free tier uses attemptsUsed (lifetime), paid tiers use monthlyScansUsed
  if (user.tier === 'free') {
    user.attemptsUsed += 1;
  } else {
    user.monthlyScansUsed += 1;
  }
  
  await user.save();
}

module.exports = { checkMonthlyLimit, incrementMonthlyScan, getTierLimit };

