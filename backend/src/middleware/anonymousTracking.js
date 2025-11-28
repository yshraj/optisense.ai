const AnonymousScan = require('../models/AnonymousScan');
const { generateFingerprintHash, hashIP, generateVisitorId } = require('../services/fingerprintService');
const { getHashedIP } = require('../services/ipService');

/**
 * Check if anonymous user has already used their free scan
 * Returns { allowed: boolean, reason?: string }
 */
async function checkAnonymousScanLimit(req) {
  const visitorId = req.cookies?.visitor_id || req.body?.visitorId;
  const fingerprintData = req.body?.fingerprint || {};
  const ipHash = getHashedIP(req);
  
  // Check 1: Visitor ID in cookie/localStorage
  if (visitorId) {
    const existingScan = await AnonymousScan.findOne({ visitorId });
    if (existingScan) {
      return {
        allowed: false,
        reason: 'visitor_id',
        message: 'You have already used your free scan. Please sign in to continue.'
      };
    }
  }
  
  // Check 2: IP-based tracking (1 per month)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentIPScan = await AnonymousScan.findOne({
    ipHash,
    usedAt: { $gte: thirtyDaysAgo }
  });
  
  if (recentIPScan) {
    return {
      allowed: false,
      reason: 'ip_limit',
      message: 'You have already used your free scan from this IP. Please sign in to continue.'
    };
  }
  
  // Check 3: Device fingerprint
  if (fingerprintData && Object.keys(fingerprintData).length > 0) {
    const fingerprintHash = generateFingerprintHash(fingerprintData);
    const existingFingerprint = await AnonymousScan.findOne({ fingerprintHash });
    
    if (existingFingerprint) {
      return {
        allowed: false,
        reason: 'fingerprint',
        message: 'You have already used your free scan on this device. Please sign in to continue.'
      };
    }
  }
  
  return { allowed: true };
}

/**
 * Record anonymous scan usage
 */
async function recordAnonymousScan(req, scanId) {
  const visitorId = req.cookies?.visitor_id || req.body?.visitorId || generateVisitorId();
  const fingerprintData = req.body?.fingerprint || {};
  const ipHash = getHashedIP(req);
  
  const fingerprintHash = fingerprintData && Object.keys(fingerprintData).length > 0
    ? generateFingerprintHash(fingerprintData)
    : null;
  
  // Create anonymous scan record
  const anonymousScan = new AnonymousScan({
    visitorId,
    ipHash,
    fingerprintHash,
    scanId,
    usedAt: new Date()
  });
  
  await anonymousScan.save();
  
  return {
    visitorId,
    anonymousScanId: anonymousScan._id
  };
}

/**
 * Middleware to check anonymous scan limits
 */
async function requireAnonymousCheck(req, res, next) {
  try {
    // Skip if user is authenticated
    if (req.user) {
      return next();
    }
    
    const check = await checkAnonymousScanLimit(req);
    
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        error: check.message,
        requiresAuth: true,
        reason: check.reason
      });
    }
    
    next();
  } catch (error) {
    console.error('Anonymous tracking error:', error);
    next(error);
  }
}

module.exports = {
  checkAnonymousScanLimit,
  recordAnonymousScan,
  requireAnonymousCheck
};

