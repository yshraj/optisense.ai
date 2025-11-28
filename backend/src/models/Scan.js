const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  // Basic Info
  url: {
    type: String,
    required: true,
    trim: true
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'processing'
  },
  
  // SEO Analysis Results
  seo: {
    title: String,
    metaDescription: String,
    canonical: String,
    statusCode: Number,
    loadTimeMs: Number,
    
    // Open Graph
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    ogType: String,
    
    // Twitter Cards
    twitterCard: String,
    twitterTitle: String,
    twitterDescription: String,
    
    // Technical
    robotsMeta: String,
    viewport: String,
    lang: String,
    charset: String,
    
    // Extracted Page Content (for recommendations)
    extractedText: {
      fullText: String,
      summary: String, // First 10000 chars
      wordCount: Number,
      paragraphs: [String],
      headings: [{
        level: String,
        text: String
      }],
      extractedAt: Date
    },
    
    // Warnings
    warnings: [String]
  },
  
  // LLM Visibility Results
  llmVisibility: {
    totalScore: Number,
    maxScore: Number,
    percentage: Number,
    
    details: [{
      promptId: String,
      prompt: String,
      response: String,
      parsedResponse: mongoose.Schema.Types.Mixed, // Store parsed JSON if available
      domainMentioned: Boolean,
      score: Number,
      citations: [String],
      recommendations: [{
        title: String,
        description: String,
        priority: {
          type: String,
          enum: ['high', 'medium', 'low']
        }
      }],
      confidence: {
        type: String,
        enum: ['high', 'medium', 'low']
      },
      tokensUsed: Number
    }],
    
    metadata: {
      totalTokens: Number,
      estimatedCost: Number
    }
  },
  
  // Errors (if any)
  error: {
    message: String,
    stack: String,
    timestamp: Date
  },
  
  // Metadata
  executionTimeMs: Number,
  
  // User tracking
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Anonymous tracking
  isAnonymous: {
    type: Boolean,
    default: false
  },
  anonymousScanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AnonymousScan'
  },
  
  // Integration data (Professional tier only)
  integrations: {
    searchConsole: mongoose.Schema.Types.Mixed,
    analytics: mongoose.Schema.Types.Mixed
  },
  
  // SEO Recommendations (Premium users, generated in background)
  recommendations: [{
    title: String,
    description: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    category: {
      type: String,
      enum: ['technical', 'content', 'authority', 'ai-visibility', 'general']
    },
    actionItems: [String]
  }],
  recommendationsGeneratedAt: Date
  
}, { 
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for faster queries
scanSchema.index({ url: 1, createdAt: -1 });
scanSchema.index({ status: 1 });
scanSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Scan', scanSchema);

