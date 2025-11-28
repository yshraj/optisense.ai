const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate JWT token for user
 */
function generateToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'optisense-secret-key-change-in-production',
    { expiresIn: '30d' }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'optisense-secret-key-change-in-production'
    );
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 * Checks for JWT token in Authorization header or cookies
 */
async function authenticate(req, res, next) {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        requiresAuth: true
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        requiresAuth: true
      });
    }
    
    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        requiresAuth: true
      });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth on error
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  generateToken,
  verifyToken
};

