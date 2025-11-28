/**
 * Rate limiting middleware to prevent API abuse
 */

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map();

/**
 * Clean up old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.expiresAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Create rate limiter middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message
 * @param {Function} options.keyGenerator - Function to generate rate limit key
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    max = 100, // 100 requests default
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => {
      // Default: use IP address
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Get or create rate limit data
    let rateLimitData = rateLimitStore.get(key);
    
    if (!rateLimitData || rateLimitData.expiresAt < now) {
      // Create new window
      rateLimitData = {
        count: 1,
        resetAt: now + windowMs,
        expiresAt: now + windowMs + 60000 // Keep for 1 min after window
      };
      rateLimitStore.set(key, rateLimitData);
      return next();
    }
    
    // Increment count
    rateLimitData.count++;
    
    // Check if limit exceeded
    if (rateLimitData.count > max) {
      const retryAfter = Math.ceil((rateLimitData.resetAt - now) / 1000);
      
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitData.resetAt).toISOString());
      
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter
      });
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - rateLimitData.count));
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitData.resetAt).toISOString());
    
    next();
  };
}

/**
 * Strict rate limiter for sensitive endpoints (OTP, auth)
 */
const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: 'Too many authentication requests. Please wait 15 minutes before trying again.',
  keyGenerator: (req) => {
    // Use IP + email for auth endpoints
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const email = req.body?.email?.toLowerCase() || 'unknown';
    return `auth:${ip}:${email}`;
  }
});

/**
 * Moderate rate limiter for analysis endpoints
 */
const analysisRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour for free users
  message: 'Rate limit exceeded. Please upgrade to premium for unlimited scans.',
  keyGenerator: (req) => {
    if (req.user) {
      return `analysis:user:${req.user._id}`;
    }
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const visitorId = req.body?.visitorId || req.cookies?.visitor_id || 'unknown';
    return `analysis:anon:${ip}:${visitorId}`;
  }
});

/**
 * Premium rate limiter (higher limits)
 */
const premiumRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour for premium users
  message: 'Rate limit exceeded. Please try again later.',
  keyGenerator: (req) => {
    return `premium:user:${req.user?._id || 'unknown'}`;
  }
});

module.exports = {
  createRateLimiter,
  strictRateLimiter,
  analysisRateLimiter,
  premiumRateLimiter
};

