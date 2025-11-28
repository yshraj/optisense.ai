const mongoose = require('mongoose');

const otpRateLimitSchema = new mongoose.Schema({
  // IP-based rate limiting
  ipHash: {
    type: String,
    required: true
  },
  
  // Email-based rate limiting
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  
  // Count and window
  count: {
    type: Number,
    default: 1
  },
  
  windowStart: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

// Indexes
otpRateLimitSchema.index({ ipHash: 1, windowStart: -1 });
otpRateLimitSchema.index({ email: 1, windowStart: -1 });
otpRateLimitSchema.index({ windowStart: 1 }, { expireAfterSeconds: 3600 }); // Auto-delete after 1 hour

module.exports = mongoose.model('OTPRateLimit', otpRateLimitSchema);

