const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendOTP, verifyOTP } = require('../services/authService');
const { generateToken } = require('../middleware/auth');
const { generateFingerprintHash } = require('../services/fingerprintService');
const { strictRateLimiter } = require('../middleware/rateLimiter');
const { sanitizeBody } = require('../middleware/security');

/**
 * POST /api/auth/send-otp
 * Send OTP to user's email
 */
router.post('/send-otp', sanitizeBody, strictRateLimiter, async (req, res) => {
  try {
    const { email, mode } = req.body; // mode: 'login' | 'signup'
    
    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }
    
    // Check email length
    if (email.length > 254) {
      return res.status(400).json({
        success: false,
        error: 'Email address is too long'
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    
    // If signup mode and user already exists with completed profile
    if (mode === 'signup' && existingUser && existingUser.brandName) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists. Please sign in instead.',
        existingAccount: true
      });
    }
    
    // Send OTP
    const { otpCode, otpExpiresAt } = await sendOTP(normalizedEmail, req);
    
    // Find or create user
    let user = existingUser;
    
    if (!user) {
      user = new User({
        email: normalizedEmail,
        otpCode,
        otpExpiresAt,
        otpVerified: false
      });
    } else {
      user.otpCode = otpCode;
      user.otpExpiresAt = otpExpiresAt;
      user.otpVerified = false;
    }
    
    await user.save();
    
    // NEVER return OTP in production - security risk
    const response = {
      success: true,
      message: 'OTP sent to your email. Please check your inbox.'
    };
    
    // Only log OTP in development mode, never in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV ONLY] OTP for ${normalizedEmail}: ${otpCode}`);
    }
    
    return res.status(200).json(response);
    
  } catch (error) {
    // Log error without sensitive data
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Send OTP error:', error.message);
    } else {
      console.error('Send OTP failed');
    }
    
    // Return generic error message in production
    return res.status(400).json({
      success: false,
      error: 'Failed to send OTP. Please check your email and try again.'
    });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and login/register user
 */
router.post('/verify-otp', sanitizeBody, strictRateLimiter, async (req, res) => {
  try {
    const { email, otp, brandName, country, brandSummary, industry, fingerprint } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    // Find user first
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found. Please request a new OTP.'
      });
    }
    
    // Check if this is a new user trying to complete registration
    const isNewUser = !user.brandName;
    const isCompletingRegistration = isNewUser && brandName && country && user.otpVerified && !user.otpCode;
    
    // OTP is required unless completing registration (user already verified)
    if (!otp && !isCompletingRegistration) {
      return res.status(400).json({
        success: false,
        error: 'OTP is required'
      });
    }
    
    // Verify OTP (unless completing registration - user already verified)
    if (!isCompletingRegistration) {
      if (!user.otpCode) {
        // If no OTP code and user is not verified, they need to request a new OTP
        if (!user.otpVerified) {
          return res.status(400).json({
            success: false,
            error: 'OTP not found. Please request a new OTP.'
          });
        }
        // If verified but completing registration, continue below
      } else {
        // Verify OTP
        const isValid = verifyOTP(user.otpCode, user.otpExpiresAt, otp);
        
        if (!isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid or expired OTP'
          });
        }
        
        // OTP verified - mark as verified
        user.otpVerified = true;
        user.otpCode = null;
        user.otpExpiresAt = null;
      }
    }
    
    // Update last login
    user.lastLoginAt = new Date();
    
    // Validate and sanitize inputs
    if (brandName) {
      const sanitizedBrandName = brandName.trim().slice(0, 100);
      if (sanitizedBrandName.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Brand name must be at least 2 characters long'
        });
      }
      user.brandName = sanitizedBrandName;
    }
    
    if (country) {
      const sanitizedCountry = country.trim().slice(0, 100);
      if (sanitizedCountry.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Country name must be at least 2 characters long'
        });
      }
      user.country = sanitizedCountry;
    }
    
    // Optional fields
    if (brandSummary) {
      const sanitizedSummary = brandSummary.trim().slice(0, 500);
      user.brandSummary = sanitizedSummary;
    }
    
    if (industry) {
      // Validate industry is in enum
      const validIndustries = [
        'Technology', 'E-commerce', 'Healthcare', 'Finance', 'Education',
        'Real Estate', 'Food & Beverage', 'Travel & Tourism', 'Fashion & Apparel',
        'Automotive', 'Entertainment', 'Sports & Fitness', 'Beauty & Personal Care',
        'Home & Garden', 'Business Services', 'Legal Services', 'Marketing & Advertising',
        'Manufacturing', 'Energy & Utilities', 'Other'
      ];
      if (validIndustries.includes(industry)) {
        user.industry = industry;
      }
    }
    
    // If new user, require brand and country
    if (isNewUser) {
      if (!user.brandName || !user.country) {
        // Mark as verified but don't generate token yet
        await user.save();
        return res.status(200).json({
          success: true,
          requiresRegistration: true,
          message: 'Please complete your profile',
          user: {
            id: user._id,
            email: user.email,
            attemptsUsed: user.attemptsUsed
          }
        });
      }
    } else if (brandName || country) {
      // Existing user updating info (optional) - already set above
    }
    
    // Store fingerprint if provided
    if (fingerprint && Object.keys(fingerprint).length > 0) {
      const fingerprintHash = generateFingerprintHash(fingerprint);
      
      // Check if fingerprint already exists
      const existingFingerprint = user.fingerprints.find(
        f => f.fingerprintHash === fingerprintHash
      );
      
      if (!existingFingerprint) {
        user.fingerprints.push({
          fingerprintHash,
          createdAt: new Date()
        });
      }
    }
    
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    // Check if user is premium
    const isPremium = user.isPremium && 
      (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());
    
    return res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        brandName: user.brandName,
        country: user.country,
        attemptsUsed: user.attemptsUsed,
        isPremium,
        premiumExpiresAt: user.premiumExpiresAt,
        isNewUser: false // Always false here since we've completed registration
      }
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify OTP'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'optisense-secret-key-change-in-production'
    );
    
    const user = await User.findById(decoded.userId).select('-otpCode -fingerprints');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if user is premium
    const isPremium = user.isPremium && 
      (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());
    
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        brandName: user.brandName,
        country: user.country,
        attemptsUsed: user.attemptsUsed,
        isPremium,
        premiumExpiresAt: user.premiumExpiresAt,
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;

