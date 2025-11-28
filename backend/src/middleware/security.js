/**
 * Security middleware for production
 */

const express = require('express');

/**
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self'"
    );
  }
  
  next();
}

/**
 * Convert size string to bytes (e.g., '10mb' -> 10485760)
 */
function parseSize(size) {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+)(kb|mb|gb|b)?$/);
  if (!match) {
    return 10 * 1024 * 1024; // Default to 10MB
  }
  
  const value = parseInt(match[1]);
  const unit = match[2] || 'b';
  return value * (units[unit] || 1);
}

/**
 * Request size limiter
 */
function requestSizeLimiter(maxSize = '10mb') {
  const maxBytes = parseSize(maxSize);
  
  return express.json({ 
    limit: maxSize,
    verify: (req, res, buf) => {
      if (buf.length > maxBytes) {
        throw new Error('Request entity too large');
      }
    }
  });
}

/**
 * Sanitize input to prevent injection attacks
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove potential script tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Validate and sanitize request body
 */
function sanitizeBody(req, res, next) {
  if (req.body) {
    // Sanitize string fields
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      } else if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key].map(item => 
          typeof item === 'string' ? sanitizeInput(item) : item
        );
      }
    });
  }
  
  next();
}

/**
 * Validate URL to prevent SSRF attacks
 */
function validateUrlSecurity(url) {
  try {
    const urlObj = new URL(url);
    
    // Block private/internal IPs
    const hostname = urlObj.hostname;
    const privateIPs = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^localhost$/,
      /^0\.0\.0\.0$/,
      /^::1$/
    ];
    
    if (privateIPs.some(pattern => pattern.test(hostname))) {
      throw new Error('Invalid URL: Private IP addresses are not allowed');
    }
    
    // Block file:// protocol
    if (urlObj.protocol === 'file:') {
      throw new Error('Invalid URL: File protocol is not allowed');
    }
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL: Only HTTP and HTTPS protocols are allowed');
    }
    
    // Block URLs longer than 2048 characters
    if (url.length > 2048) {
      throw new Error('Invalid URL: URL is too long');
    }
    
    return true;
  } catch (error) {
    throw new Error(`URL validation failed: ${error.message}`);
  }
}

/**
 * Log security events (without sensitive data)
 */
function logSecurityEvent(type, req, details = {}) {
  if (process.env.NODE_ENV === 'production') {
    // In production, log to security monitoring system
    const logData = {
      type,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
      ...details
    };
    
    // Remove sensitive data
    delete logData.body;
    delete logData.password;
    delete logData.otp;
    delete logData.token;
    
    console.log(`[SECURITY] ${type}:`, JSON.stringify(logData));
  }
}

module.exports = {
  securityHeaders,
  requestSizeLimiter,
  sanitizeInput,
  sanitizeBody,
  validateUrlSecurity,
  logSecurityEvent
};

