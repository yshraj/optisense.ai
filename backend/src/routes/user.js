const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const Scan = require('../models/Scan');

/**
 * GET /api/user/profile
 * Get user profile and scan history
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'scans',
        select: 'url status seo llmVisibility createdAt executionTimeMs',
        options: { sort: { createdAt: -1 }, limit: 50 }
      })
      .select('-otpCode -fingerprints');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        brandName: user.brandName,
        country: user.country,
        attemptsUsed: user.attemptsUsed,
        scans: user.scans,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

/**
 * GET /api/user/scans
 * Get user's scan history
 */
router.get('/scans', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // Optional status filter
    const search = req.query.search; // Optional URL search filter
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { userId: req.user._id };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search && search.trim()) {
      // Case-insensitive search in URL
      query.url = { $regex: search.trim(), $options: 'i' };
    }
    
    const scans = await Scan.find(query)
      .select('url status seo llmVisibility createdAt executionTimeMs')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Scan.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      scans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get scans error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get scans'
    });
  }
});

module.exports = router;

