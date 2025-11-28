const { hashIP } = require('./fingerprintService');

/**
 * Extract client IP from request
 * Handles proxies and load balancers
 */
function getClientIP(req) {
  // Check various headers (in order of preference)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  
  // Fallback to connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'unknown';
}

/**
 * Get hashed IP from request
 */
function getHashedIP(req) {
  const ip = getClientIP(req);
  return hashIP(ip);
}

module.exports = {
  getClientIP,
  getHashedIP
};

