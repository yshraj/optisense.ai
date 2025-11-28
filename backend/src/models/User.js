const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // OTP fields (for Firebase Auth, we'll store session tokens)
  otpCode: String,
  otpExpiresAt: Date,
  otpVerified: {
    type: Boolean,
    default: false
  },
  
  // User profile
  brandName: String,
  country: String,
  brandSummary: {
    type: String,
    maxlength: 500 // 1-2 sentences
  },
  industry: {
    type: String,
    enum: [
      'Technology', 'E-commerce', 'Healthcare', 'Finance', 'Education',
      'Real Estate', 'Food & Beverage', 'Travel & Tourism', 'Fashion & Apparel',
      'Automotive', 'Entertainment', 'Sports & Fitness', 'Beauty & Personal Care',
      'Home & Garden', 'Business Services', 'Legal Services', 'Marketing & Advertising',
      'Manufacturing', 'Energy & Utilities', 'Other'
    ]
  },
  
  // Usage tracking
  attemptsUsed: {
    type: Number,
    default: 0,
    min: 0
    // No max limit - premium users can have 100/month, free users limited by application logic
  },
  monthlyScansUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  lastMonthReset: {
    type: Date,
    default: Date.now
  },
  
  // Scan history references
  scans: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan'
  }],
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Premium tier
  isPremium: {
    type: Boolean,
    default: false,
    index: true
  },
  tier: {
    type: String,
    enum: ['free', 'starter', 'professional'],
    default: 'free',
    index: true
  },
  premiumExpiresAt: {
    type: Date,
    default: null
  },
  
  // Device fingerprint (for abuse detection)
  fingerprints: [{
    fingerprintHash: String,
    createdAt: Date
  }],
  
  // Last login
  lastLoginAt: Date
  
}, { 
  timestamps: true 
});

// Indexes
// Note: email index is automatically created by unique: true
userSchema.index({ attemptsUsed: 1 });
userSchema.index({ 'fingerprints.fingerprintHash': 1 });

/**
 * Get tier-based scan limit
 * @param {Object} user - User document
 * @returns {Number} Maximum scans allowed for the tier
 */
userSchema.statics.getTierLimit = function(user) {
  if (!user) return 3; // Free tier default
  
  const now = new Date();
  const isActivePremium = user.isPremium && 
    (!user.premiumExpiresAt || user.premiumExpiresAt > now);
  
  // If user has isPremium flag but tier is 'free', treat as professional (migration case)
  if (isActivePremium && user.tier === 'free') {
    return 200; // Professional tier limit
  }
  
  switch (user.tier) {
    case 'starter':
      return 50;
    case 'professional':
      return 200;
    case 'free':
    default:
      return 3; // Lifetime limit for free tier
  }
};

/**
 * Check if user has active premium subscription
 */
userSchema.methods.isActivePremium = function() {
  const now = new Date();
  return this.isPremium && 
    (!this.premiumExpiresAt || this.premiumExpiresAt > now) &&
    this.tier !== 'free';
};

module.exports = mongoose.model('User', userSchema);

