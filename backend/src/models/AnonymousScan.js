const mongoose = require('mongoose');

const anonymousScanSchema = new mongoose.Schema({
  // Visitor tracking
  visitorId: {
    type: String
  },
  
  // IP tracking (hashed)
  ipHash: {
    type: String,
    required: true
  },
  
  // Device fingerprint
  fingerprintHash: {
    type: String
  },
  
  // Usage tracking
  usedAt: {
    type: Date,
    default: Date.now
  },
  
  // Scan reference (optional)
  scanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scan'
  }
}, { 
  timestamps: true 
});

// Indexes for efficient queries
anonymousScanSchema.index({ ipHash: 1, usedAt: -1 }); // Compound index for IP + date queries
anonymousScanSchema.index({ visitorId: 1 });
anonymousScanSchema.index({ fingerprintHash: 1 });
// Note: usedAt is included in compound index above, and TTL index below
// TTL index to auto-delete records older than 30 days
anonymousScanSchema.index({ usedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

module.exports = mongoose.model('AnonymousScan', anonymousScanSchema);

