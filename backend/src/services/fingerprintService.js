const crypto = require('crypto');

/**
 * Generate device fingerprint hash from browser data
 * @param {Object} fingerprintData - Browser fingerprint data
 * @returns {String} - SHA256 hash of fingerprint
 */
function generateFingerprintHash(fingerprintData) {
  const {
    userAgent = '',
    timezone = '',
    screenResolution = '',
    platform = '',
    cores = '',
    visitorId = ''
  } = fingerprintData;
  
  // Combine all fingerprint components
  const fingerprintString = [
    userAgent,
    timezone,
    screenResolution,
    platform,
    cores,
    visitorId
  ].join('|');
  
  // Generate SHA256 hash
  return crypto
    .createHash('sha256')
    .update(fingerprintString)
    .digest('hex');
}

/**
 * Hash IP address for privacy
 * @param {String} ip - IP address
 * @returns {String} - SHA256 hash of IP
 */
function hashIP(ip) {
  // Remove IPv6 prefix if present
  const cleanIP = ip.replace(/^::ffff:/, '');
  
  return crypto
    .createHash('sha256')
    .update(cleanIP + (process.env.IP_SALT || 'optisense-salt'))
    .digest('hex');
}

/**
 * Generate a unique visitor ID
 * @returns {String} - UUID-like string
 */
function generateVisitorId() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = {
  generateFingerprintHash,
  hashIP,
  generateVisitorId
};

