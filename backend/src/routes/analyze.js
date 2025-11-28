const express = require('express');
const router = express.Router();
const Scan = require('../models/Scan');
const User = require('../models/User');
const { analyzeSEO } = require('../services/seoService');
const { analyzeLLMVisibility } = require('../services/llmService');
const { validateUrl } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');
const { checkAnonymousScanLimit, recordAnonymousScan } = require('../middleware/anonymousTracking');
const { analysisRateLimiter } = require('../middleware/rateLimiter');
const { validateUrlSecurity, sanitizeBody } = require('../middleware/security');
const { checkMonthlyLimit, incrementMonthlyScan } = require('../middleware/monthlyLimit');

/**
 * POST /api/analyze
 * Analyzes a URL for SEO + LLM visibility
 * Enforces: 1 free anonymous scan, then requires auth (3 attempts for free, 100 for premium)
 */
router.post('/', 
  sanitizeBody,
  validateUrl, 
  optionalAuth, 
  analysisRateLimiter,
  async (req, res) => {
  const { url } = req.body;
  const overallStartTime = Date.now();
  
  // Validate URL security (prevent SSRF)
  try {
    validateUrlSecurity(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n🚀 Starting analysis for: ${url}`);
  }
  
  let scan;
  
  try {
    // Check usage limits
    if (req.user) {
      // Check monthly limits (auto-resets monthly for premium)
      const limitCheck = await checkMonthlyLimit(req.user);
      
      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: limitCheck.isPremium
            ? `You have reached your monthly scan limit (${limitCheck.maxScans} scans). Your limit will reset on ${new Date(limitCheck.resetDate.getFullYear(), limitCheck.resetDate.getMonth() + 1, 1).toLocaleDateString()}.`
            : 'You have used all 3 attempts. Please upgrade to continue.',
          requiresUpgrade: !limitCheck.isPremium,
          scansUsed: limitCheck.scansUsed,
          maxScans: limitCheck.maxScans,
          isMonthly: limitCheck.isPremium
        });
      }
    } else {
      // Anonymous user: check if they've used their free scan
      const anonymousCheck = await checkAnonymousScanLimit(req);
      if (!anonymousCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: anonymousCheck.message,
          requiresAuth: true,
          reason: anonymousCheck.reason
        });
      }
    }
    
    // Create scan record
    scan = new Scan({
      url: url,
      status: 'processing',
      userId: req.user?._id || null,
      isAnonymous: !req.user
    });
    await scan.save();
    
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✓ Scan record created: ${scan._id}`);
      console.log('⏳ Running SEO + LLM analysis...');
    }
    
    // Check if user is Professional tier and has integrations
    let integrationData = null;
    if (req.user && (req.user.tier === 'professional' || req.user.isPremium)) {
      try {
        const Integration = require('../models/Integration');
        const { fetchSearchConsoleData, fetchAnalyticsData } = require('../services/integrationService');
        
        const integrations = await Integration.find({ userId: req.user._id });
        const hasGSC = integrations.some(i => i.provider === 'google_search_console');
        const hasGA = integrations.some(i => i.provider === 'google_analytics');
        
        if (hasGSC || hasGA) {
          integrationData = {};
          
          // Fetch GSC data if connected
          if (hasGSC) {
            try {
              const gscData = await fetchSearchConsoleData(req.user._id.toString());
              integrationData.searchConsole = gscData;
            } catch (gscError) {
              console.warn('Failed to fetch GSC data:', gscError.message);
              integrationData.searchConsole = { error: gscError.message };
            }
          }
          
          // Fetch GA data if connected
          if (hasGA) {
            try {
              const gaData = await fetchAnalyticsData(req.user._id.toString());
              integrationData.analytics = gaData;
            } catch (gaError) {
              console.warn('Failed to fetch GA data:', gaError.message);
              integrationData.analytics = { error: gaError.message };
            }
          }
        }
      } catch (integrationError) {
        console.warn('Integration data fetch failed:', integrationError.message);
        // Continue without integration data
      }
    }
    
    // Determine if user is premium
    let isPremium = false;
    let businessInfo = {};
    
    if (req.user) {
      isPremium = req.user.isPremium && 
        (!req.user.premiumExpiresAt || req.user.premiumExpiresAt > new Date()) &&
        req.user.tier !== 'free';
      
      // Get business info for premium users (if available)
      if (isPremium && req.user.businessInfo) {
        businessInfo = {
          brandName: req.user.businessInfo.brandName || req.user.name,
          industry: req.user.businessInfo.industry,
          brandSummary: req.user.businessInfo.brandSummary
        };
      }
    }
    
    // Run SEO and LLM analysis in parallel, but allow partial failures
    const [seoResult, llmResult] = await Promise.allSettled([
      analyzeSEO(url, { isPremium }),
      analyzeLLMVisibility(url, { isPremium, businessInfo })
    ]);
    
    // Handle SEO results
    let seoData = null;
    let seoError = null;
    if (seoResult.status === 'fulfilled') {
      seoData = seoResult.value;
    } else {
      seoError = seoResult.reason?.message || 'SEO analysis failed';
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ SEO analysis failed (non-fatal): ${seoError}`);
      }
      // Create minimal SEO data structure to allow analysis to continue
      seoData = {
        error: seoError,
        statusCode: null,
        warnings: [`SEO analysis failed: ${seoError}`]
      };
    }
    
    // Handle LLM results
    let llmData = null;
    let llmError = null;
    if (llmResult.status === 'fulfilled') {
      llmData = llmResult.value;
    } else {
      llmError = llmResult.reason?.message || 'LLM analysis failed';
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ LLM analysis failed (non-fatal): ${llmError}`);
      }
      // Create minimal LLM data structure to allow analysis to continue
      llmData = {
        error: llmError,
        totalScore: 0,
        maxScore: 0,
        percentage: 0,
        details: [],
        metadata: { error: llmError }
      };
    }
    
    // Only fail completely if both analyses failed
    if (seoError && llmError) {
      throw new Error(`Both SEO and LLM analyses failed. SEO: ${seoError}, LLM: ${llmError}`);
    }
    
    // Update scan with results
    scan.seo = seoData;
    scan.llmVisibility = llmData;
    if (integrationData) {
      scan.integrations = integrationData;
    }
    scan.status = 'completed';
    scan.executionTimeMs = Date.now() - overallStartTime;
    
    // Record usage
    if (req.user) {
      // Logged-in user: increment monthly/attempts and link scan
      await incrementMonthlyScan(req.user);
      req.user.scans.push(scan._id);
      await req.user.save();
      scan.userId = req.user._id;
    } else {
      // Anonymous user: record anonymous scan
      const anonymousRecord = await recordAnonymousScan(req, scan._id);
      scan.anonymousScanId = anonymousRecord.anonymousScanId;
    }
    
    await scan.save();
    
    // For premium users, generate recommendations in background
    if (isPremium) {
      // Don't await - run in background
      generateRecommendationsInBackground(scan._id, {
        seo: seoData,
        llmVisibility: llmData,
        url: url
      }, businessInfo).catch(error => {
        console.error('Background recommendation generation failed:', error.message);
      });
    }
    
    // Determine user tier and get limit info
    const { getTierLimit } = require('../middleware/monthlyLimit');
    let limitInfo = { scansUsed: 0, maxScans: 1, isFreeTier: true };
    
    if (req.user) {
      limitInfo = await checkMonthlyLimit(req.user);
    }
    const isFreeUser = !req.user || (req.user.tier === 'free' && req.user.attemptsUsed >= 3);
    
    // Only log in development (no sensitive data)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Analysis completed in ${scan.executionTimeMs}ms`);
      if (req.user) {
        console.log(`👤 User tier: ${req.user.tier}, scans: ${limitInfo.scansUsed}/${limitInfo.maxScans}`);
      } else {
        console.log(`👤 Anonymous scan recorded`);
      }
    }
    
    // Return response with warnings if there were partial failures
    const warnings = [];
    if (seoError) warnings.push(`SEO analysis had issues: ${seoError}`);
    if (llmError) warnings.push(`LLM analysis had issues: ${llmError}`);
    
    return res.status(200).json({
      success: true,
      scanId: scan._id,
      executionTimeMs: scan.executionTimeMs,
      attemptsUsed: limitInfo.scansUsed,
      attemptsRemaining: Math.max(0, limitInfo.maxScans - limitInfo.scansUsed),
      maxScans: limitInfo.maxScans,
      isMonthlyLimit: !limitInfo.isFreeTier,
      isAnonymous: !req.user,
      isPremium: isPremium,
      isFreeUser: isFreeUser,
      warnings: warnings.length > 0 ? warnings : undefined,
      result: {
        url: scan.url,
        analyzedAt: scan.createdAt,
        seo: scan.seo,
        llmVisibility: scan.llmVisibility,
        integrations: scan.integrations || null
      }
    });
    
  } catch (error) {
    // Log error without sensitive data
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ Analysis failed (fatal error): ${error.message}`);
    } else {
      // In production, log minimal error info
      console.error(`Analysis failed (fatal) for ${req.user?._id || 'anonymous'}`);
    }
    
    // Save error if scan exists
    if (scan && scan._id) {
      scan.status = 'failed';
      scan.error = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      };
      await scan.save();
    }
    
    return res.status(500).json({
      success: false,
      error: error.message,
      scanId: scan?._id || null
    });
  }
});

/**
 * GET /api/analyze/:scanId
 * Retrieves a previous scan result
 */
router.get('/:scanId', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.scanId);
    
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      result: scan
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate recommendations in background (non-blocking)
 */
async function generateRecommendationsInBackground(scanId, analysisData, businessInfo) {
  try {
    console.log(`🔄 Starting background recommendation generation for scan ${scanId}`);
    
    const { generateSEORecommendations } = require('../services/seoRecommendationService');
    const recommendations = await generateSEORecommendations(analysisData, businessInfo);
    
    // Update scan with recommendations
    const scan = await Scan.findById(scanId);
    if (scan) {
      scan.recommendations = recommendations;
      scan.recommendationsGeneratedAt = new Date();
      await scan.save();
      console.log(`✅ Recommendations generated and saved for scan ${scanId}`);
    }
  } catch (error) {
    console.error(`❌ Background recommendation generation failed for scan ${scanId}:`, error.message);
    // Don't throw - this is background process
  }
}

module.exports = router;

