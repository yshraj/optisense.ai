require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const analyzeRoutes = require('./routes/analyze');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const compareRoutes = require('./routes/compare');
const exportRoutes = require('./routes/export');
const recommendationRoutes = require('./routes/recommendations');
const integrationRoutes = require('./routes/integrations');
const { securityHeaders, requestSizeLimiter } = require('./middleware/security');

const app = express();

// Only connect to DB if not in test environment
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Security middleware (must be first)
app.use(securityHeaders);
app.use(requestSizeLimiter('10mb'));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Model health check endpoint
app.get('/api/health/models', async (req, res) => {
  try {
    const { checkAllModels, getHealthStatus, getHealthyModels } = require('./services/modelHealthCheckService');
    
    // Optionally refresh health status
    if (req.query.refresh === 'true') {
      await checkAllModels();
    }
    
    const status = getHealthStatus();
    const healthy = getHealthyModels();
    
    res.json({
      success: true,
      lastChecked: status.lastChecked,
      healthyCount: healthy.length,
      totalCount: Object.keys(status.models || {}).length,
      healthyModels: healthy.map(m => ({
        name: m.name,
        provider: m.config?.provider,
        responseTime: m.status.responseTime
      })),
      allModels: status.models
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'OptiSenseAI API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      analyze: 'POST /api/analyze',
      auth: {
        sendOTP: 'POST /api/auth/send-otp',
        verifyOTP: 'POST /api/auth/verify-otp',
        me: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      }
    }
  });
});

// API Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/recommendations', recommendationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({
    success: false,
    error: errorMessage
  });
});

module.exports = app;

