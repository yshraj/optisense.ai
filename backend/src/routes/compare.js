const express = require('express');
const router = express.Router();
const Scan = require('../models/Scan');
const { analyzeSEO } = require('../services/seoService');
const { analyzeLLMVisibility } = require('../services/llmService');
const { authenticate } = require('../middleware/auth');

/**
 * Validate URLs array
 */
function validateUrls(req, res, next) {
  const { urls } = req.body;
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({
      success: false,
      error: 'URLs array is required'
    });
  }
  
  if (urls.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Please provide at least 2 URLs to compare'
    });
  }
  
  if (urls.length > 5) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 5 URLs can be compared at once'
    });
  }
  
  // Validate each URL
  for (const url of urls) {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol) || !urlObj.hostname) {
        return res.status(400).json({
          success: false,
          error: `Invalid URL: ${url}`
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Invalid URL format: ${url}`
      });
    }
  }
  
  next();
}

/**
 * POST /api/compare
 * Compare multiple URLs (competitor analysis)
 * Requires authentication and premium tier
 */
router.post('/', authenticate, validateUrls, async (req, res) => {
  const { urls } = req.body;
  
  // Check if user is premium
  const isPremium = req.user.isPremium && 
    (!req.user.premiumExpiresAt || req.user.premiumExpiresAt > new Date());
  
  if (!isPremium) {
    return res.status(403).json({
      success: false,
      error: 'Competitor comparison is a premium feature. Please upgrade to access this feature.',
      requiresUpgrade: true
    });
  }
  
  const overallStartTime = Date.now();
  console.log(`\n🔍 Starting competitor comparison for ${urls.length} URLs`);
  
  try {
    const results = [];
    
    // Analyze all URLs in parallel
    const analysisPromises = urls.map(async (url) => {
      try {
        const [seoData, llmData] = await Promise.all([
          analyzeSEO(url),
          analyzeLLMVisibility(url)
        ]);
        
        return {
          url,
          seo: seoData,
          llmVisibility: llmData,
          success: true
        };
      } catch (error) {
        console.error(`❌ Analysis failed for ${url}: ${error.message}`);
        return {
          url,
          error: error.message,
          success: false
        };
      }
    });
    
    const analyses = await Promise.all(analysisPromises);
    
    // Calculate comparison metrics
    const comparison = {
      urls: analyses.map(a => a.url),
      results: analyses,
      metrics: {
        llmVisibility: analyses
          .filter(a => a.success)
          .map(a => ({
            url: a.url,
            score: a.llmVisibility.percentage,
            totalScore: a.llmVisibility.totalScore,
            maxScore: a.llmVisibility.maxScore
          }))
          .sort((a, b) => b.score - a.score),
        seoWarnings: analyses
          .filter(a => a.success)
          .map(a => ({
            url: a.url,
            warningCount: a.seo.warnings?.length || 0
          }))
          .sort((a, b) => a.warningCount - b.warningCount),
        citations: analyses
          .filter(a => a.success)
          .map(a => ({
            url: a.url,
            citationCount: a.llmVisibility.details?.reduce((sum, detail) => 
              sum + (detail.citations?.length || 0), 0) || 0
          }))
          .sort((a, b) => b.citationCount - a.citationCount)
      },
      executionTimeMs: Date.now() - overallStartTime,
      analyzedAt: new Date()
    };
    
    console.log(`✅ Comparison completed in ${comparison.executionTimeMs}ms`);
    
    return res.status(200).json({
      success: true,
      comparison
    });
    
  } catch (error) {
    console.error(`❌ Comparison failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

