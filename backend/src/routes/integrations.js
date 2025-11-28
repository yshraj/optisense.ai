const express = require('express');
const router = express.Router();
const Integration = require('../models/Integration');
const { authenticate: requireAuth } = require('../middleware/auth');
const {
  getAuthUrl,
  connectGoogleAccount,
  fetchSearchConsoleData,
  fetchAnalyticsData
} = require('../services/integrationService');

/**
 * GET /api/integrations/google/connect
 * Initiate OAuth flow - redirects to Google
 */
router.get('/google/connect', requireAuth, (req, res) => {
  try {
    const provider = req.query.provider || 'both'; // 'google_search_console', 'google_analytics', or 'both'
    const authUrl = getAuthUrl(req.user._id.toString(), provider);
    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    });
  }
});

/**
 * GET /api/integrations/google/callback
 * OAuth callback - receives authorization code
 */
router.get('/google/callback', requireAuth, async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code not provided'
      });
    }
    
    // Parse state to get userId and provider
    let userId = req.user._id.toString();
    let provider = 'both';
    
    if (state) {
      try {
        const stateData = JSON.parse(state);
        userId = stateData.userId || userId;
        provider = stateData.provider || 'both';
      } catch (e) {
        // State parsing failed, use defaults
      }
    }
    
    // Connect account
    await connectGoogleAccount(userId, code, provider);
    
    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/account?integration=success`);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/account?integration=error&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/integrations
 * List user's integrations
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const integrations = await Integration.find({ userId: req.user._id });
    
    // Return integrations without sensitive data
    const safeIntegrations = integrations.map(integration => ({
      _id: integration._id,
      provider: integration.provider,
      properties: integration.properties,
      defaultPropertyId: integration.defaultPropertyId,
      lastSyncAt: integration.lastSyncAt,
      syncStatus: integration.syncStatus,
      lastError: integration.lastError,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt
    }));
    
    res.json({
      success: true,
      integrations: safeIntegrations
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrations'
    });
  }
});

/**
 * POST /api/integrations/:id/disconnect
 * Disconnect an integration
 */
router.post('/:id/disconnect', requireAuth, async (req, res) => {
  try {
    const integration = await Integration.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found'
      });
    }
    
    await Integration.deleteOne({ _id: integration._id });
    
    res.json({
      success: true,
      message: 'Integration disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect integration'
    });
  }
});

/**
 * GET /api/integrations/search-console/data
 * Fetch Search Console data
 */
router.get('/search-console/data', requireAuth, async (req, res) => {
  try {
    // Check if user is on Professional tier
    if (req.user.tier !== 'professional' && !req.user.isPremium) {
      return res.status(403).json({
        success: false,
        error: 'Search Console integration requires Professional tier'
      });
    }
    
    const propertyUrl = req.query.propertyUrl || null;
    const dateRange = req.query.startDate && req.query.endDate ? {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    } : null;
    
    const data = await fetchSearchConsoleData(
      req.user._id.toString(),
      propertyUrl,
      dateRange
    );
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching Search Console data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Search Console data'
    });
  }
});

/**
 * GET /api/integrations/analytics/data
 * Fetch Analytics data
 */
router.get('/analytics/data', requireAuth, async (req, res) => {
  try {
    // Check if user is on Professional tier
    if (req.user.tier !== 'professional' && !req.user.isPremium) {
      return res.status(403).json({
        success: false,
        error: 'Analytics integration requires Professional tier'
      });
    }
    
    const viewId = req.query.viewId || null;
    const dateRange = req.query.startDate && req.query.endDate ? {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    } : null;
    
    const data = await fetchAnalyticsData(
      req.user._id.toString(),
      viewId,
      dateRange
    );
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching Analytics data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Analytics data'
    });
  }
});

module.exports = router;

