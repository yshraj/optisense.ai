const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { generateWarningRecommendation } = require('../services/warningRecommendationService');

/**
 * POST /api/recommendations/warning
 * Generate detailed AI recommendation for a specific SEO warning
 * Requires authentication
 */
router.post('/warning', authenticate, async (req, res) => {
  try {
    const { warning, context } = req.body;
    
    if (!warning) {
      return res.status(400).json({
        success: false,
        error: 'Warning message is required'
      });
    }
    
    // Check if user is premium
    const isPremium = req.user.isPremium && 
      (!req.user.premiumExpiresAt || req.user.premiumExpiresAt > new Date());
    
    if (!isPremium) {
      return res.status(403).json({
        success: false,
        error: 'AI recommendations are a premium feature',
        requiresUpgrade: true
      });
    }
    
    const recommendation = await generateWarningRecommendation(warning, context || {});
    
    return res.status(200).json({
      success: true,
      recommendation
    });
    
  } catch (error) {
    console.error('Recommendation generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate recommendation'
    });
  }
});

module.exports = router;

