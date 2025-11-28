const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Integration Model
 * Stores OAuth tokens and connection info for third-party integrations
 */

// Encryption/Decryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  if (!text) return null;
  try {
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf8');
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

const integrationSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Integration provider
  provider: {
    type: String,
    enum: ['google_search_console', 'google_analytics'],
    required: true,
    index: true
  },
  
  // Encrypted OAuth tokens
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  tokenExpiry: {
    type: Date,
    required: true
  },
  
  // Connected properties/views
  properties: [{
    id: String, // Property ID (GSC) or View ID (GA)
    name: String, // Human-readable name
    url: String, // Property URL (for GSC)
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  
  // Default property to use
  defaultPropertyId: String,
  
  // Last sync timestamp
  lastSyncAt: {
    type: Date,
    default: Date.now
  },
  
  // Sync status
  syncStatus: {
    type: String,
    enum: ['active', 'error', 'expired'],
    default: 'active'
  },
  
  // Error message if sync failed
  lastError: {
    message: String,
    timestamp: Date
  }
  
}, {
  timestamps: true
});

// Indexes
integrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

// Virtual for decrypted access token (not stored in DB)
integrationSchema.virtual('decryptedAccessToken').get(function() {
  return decrypt(this.accessToken);
});

integrationSchema.virtual('decryptedRefreshToken').get(function() {
  return decrypt(this.refreshToken);
});

// Methods to encrypt before saving
integrationSchema.pre('save', function(next) {
  if (this.isModified('accessToken') && !this.accessToken.includes(':')) {
    // Only encrypt if not already encrypted (doesn't contain ':')
    this.accessToken = encrypt(this.accessToken);
  }
  if (this.isModified('refreshToken') && !this.refreshToken.includes(':')) {
    this.refreshToken = encrypt(this.refreshToken);
  }
  next();
});

// Method to check if token is expired
integrationSchema.methods.isTokenExpired = function() {
  return this.tokenExpiry < new Date();
};

// Method to get decrypted tokens
integrationSchema.methods.getTokens = function() {
  return {
    accessToken: decrypt(this.accessToken),
    refreshToken: decrypt(this.refreshToken)
  };
};

module.exports = mongoose.model('Integration', integrationSchema);

