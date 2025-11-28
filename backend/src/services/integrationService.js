/**
 * Integration Service
 * Handles Google OAuth flow and data fetching from GSC/GA
 * 
 * Requires: npm install googleapis
 */

const { google } = require('googleapis');
const Integration = require('../models/Integration');

// OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/integrations/google/callback';

// OAuth2 scopes
const SCOPES = {
  searchConsole: ['https://www.googleapis.com/auth/webmasters.readonly'],
  analytics: ['https://www.googleapis.com/auth/analytics.readonly'],
  both: [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly'
  ]
};

/**
 * Get OAuth2 client
 */
function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate OAuth2 authorization URL
 * @param {string} userId - User ID
 * @param {string} provider - 'google_search_console' or 'google_analytics' or 'both'
 * @returns {string} Authorization URL
 */
function getAuthUrl(userId, provider = 'both') {
  const oauth2Client = getOAuth2Client();
  const scopes = provider === 'both' ? SCOPES.both : 
                 provider === 'google_search_console' ? SCOPES.searchConsole : 
                 SCOPES.analytics;
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state: JSON.stringify({ userId, provider })
  });
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from callback
 * @returns {Object} Tokens and user info
 */
async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  // Get user info
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000),
    email: data.email
  };
}

/**
 * Connect Google account
 * @param {string} userId - User ID
 * @param {string} code - Authorization code
 * @param {string} provider - 'google_search_console' or 'google_analytics' or 'both'
 * @returns {Object} Integration document
 */
async function connectGoogleAccount(userId, code, provider = 'both') {
  try {
    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code);
    
    // Check if integration already exists
    let integration = await Integration.findOne({ userId, provider: provider === 'both' ? 'google_search_console' : provider });
    
    if (integration) {
      // Update existing integration
      integration.accessToken = tokenData.accessToken; // Will be encrypted by pre-save hook
      integration.refreshToken = tokenData.refreshToken;
      integration.tokenExpiry = tokenData.expiryDate;
      integration.syncStatus = 'active';
      integration.lastError = null;
    } else {
      // Create new integration
      // For 'both', create two separate integrations
      if (provider === 'both') {
        // Create GSC integration
        const gscIntegration = new Integration({
          userId,
          provider: 'google_search_console',
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiry: tokenData.expiryDate,
          syncStatus: 'active'
        });
        await gscIntegration.save();
        
        // Create GA integration
        const gaIntegration = new Integration({
          userId,
          provider: 'google_analytics',
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiry: tokenData.expiryDate,
          syncStatus: 'active'
        });
        await gaIntegration.save();
        
        return { gsc: gscIntegration, ga: gaIntegration };
      } else {
        integration = new Integration({
          userId,
          provider,
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          tokenExpiry: tokenData.expiryDate,
          syncStatus: 'active'
        });
        await integration.save();
      }
    }
    
    // Fetch and store properties
    if (provider === 'google_search_console' || provider === 'both') {
      await fetchAndStoreGSCProperties(userId);
    }
    if (provider === 'google_analytics' || provider === 'both') {
      await fetchAndStoreGAProperties(userId);
    }
    
    return integration;
  } catch (error) {
    console.error('Error connecting Google account:', error);
    throw error;
  }
}

/**
 * Refresh access token
 * @param {Object} integration - Integration document
 * @returns {Object} New tokens
 */
async function refreshAccessToken(integration) {
  try {
    const tokens = integration.getTokens();
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update integration
    integration.accessToken = credentials.access_token;
    integration.tokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600 * 1000);
    integration.syncStatus = 'active';
    await integration.save();
    
    return {
      accessToken: credentials.access_token,
      expiryDate: integration.tokenExpiry
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    integration.syncStatus = 'error';
    integration.lastError = {
      message: error.message,
      timestamp: new Date()
    };
    await integration.save();
    throw error;
  }
}

/**
 * Get authenticated client for API calls
 * @param {Object} integration - Integration document
 * @returns {Object} Authenticated OAuth2 client
 */
async function getAuthenticatedClient(integration) {
  const tokens = integration.getTokens();
  const oauth2Client = getOAuth2Client();
  
  // Check if token is expired
  if (integration.isTokenExpired()) {
    await refreshAccessToken(integration);
    // Get updated tokens
    const updatedIntegration = await Integration.findById(integration._id);
    const updatedTokens = updatedIntegration.getTokens();
    oauth2Client.setCredentials({
      access_token: updatedTokens.accessToken,
      refresh_token: updatedTokens.refreshToken
    });
  } else {
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    });
  }
  
  return oauth2Client;
}

/**
 * Fetch Search Console properties
 */
async function fetchAndStoreGSCProperties(userId) {
  try {
    const integration = await Integration.findOne({ userId, provider: 'google_search_console' });
    if (!integration) return;
    
    const auth = await getAuthenticatedClient(integration);
    const webmasters = google.webmasters({ version: 'v3', auth });
    
    const { data } = await webmasters.sites.list();
    
    if (data.siteEntry) {
      integration.properties = data.siteEntry.map(site => ({
        id: site.siteUrl,
        name: site.siteUrl,
        url: site.siteUrl,
        isDefault: false
      }));
      
      if (integration.properties.length > 0) {
        integration.properties[0].isDefault = true;
        integration.defaultPropertyId = integration.properties[0].id;
      }
      
      await integration.save();
    }
  } catch (error) {
    console.error('Error fetching GSC properties:', error);
  }
}

/**
 * Fetch Analytics properties
 */
async function fetchAndStoreGAProperties(userId) {
  try {
    const integration = await Integration.findOne({ userId, provider: 'google_analytics' });
    if (!integration) return;
    
    const auth = await getAuthenticatedClient(integration);
    const analytics = google.analytics({ version: 'v3', auth });
    
    const { data } = await analytics.management.accounts.list();
    
    if (data.items) {
      // Get first account's properties
      const accountId = data.items[0]?.id;
      if (accountId) {
        const { data: webProps } = await analytics.management.webproperties.list({ accountId });
        
        if (webProps.items) {
          integration.properties = webProps.items.map(prop => ({
            id: prop.id, // View ID
            name: prop.name,
            url: prop.websiteUrl,
            isDefault: false
          }));
          
          if (integration.properties.length > 0) {
            integration.properties[0].isDefault = true;
            integration.defaultPropertyId = integration.properties[0].id;
          }
          
          await integration.save();
        }
      }
    }
  } catch (error) {
    console.error('Error fetching GA properties:', error);
  }
}

/**
 * Fetch Search Console data
 * @param {string} userId - User ID
 * @param {string} propertyUrl - Property URL (optional, uses default if not provided)
 * @param {Object} dateRange - { startDate, endDate } in YYYY-MM-DD format
 * @returns {Object} Search Console data
 */
async function fetchSearchConsoleData(userId, propertyUrl = null, dateRange = null) {
  try {
    const integration = await Integration.findOne({ userId, provider: 'google_search_console' });
    if (!integration) {
      throw new Error('Google Search Console not connected');
    }
    
    const auth = await getAuthenticatedClient(integration);
    const webmasters = google.webmasters({ version: 'v3', auth });
    
    const siteUrl = propertyUrl || integration.defaultPropertyId || integration.properties[0]?.id;
    if (!siteUrl) {
      throw new Error('No Search Console property available');
    }
    
    // Default to last 30 days
    const endDate = dateRange?.endDate || new Date().toISOString().split('T')[0];
    const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data } = await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page'],
        rowLimit: 10
      }
    });
    
    // Update last sync
    integration.lastSyncAt = new Date();
    integration.syncStatus = 'active';
    await integration.save();
    
    return {
      siteUrl,
      dateRange: { startDate, endDate },
      rows: data.rows || [],
      totals: data.responseAggregationType || 'auto'
    };
  } catch (error) {
    console.error('Error fetching Search Console data:', error);
    throw error;
  }
}

/**
 * Fetch Analytics data
 * @param {string} userId - User ID
 * @param {string} viewId - View ID (optional, uses default if not provided)
 * @param {Object} dateRange - { startDate, endDate } in YYYY-MM-DD format
 * @returns {Object} Analytics data
 */
async function fetchAnalyticsData(userId, viewId = null, dateRange = null) {
  try {
    const integration = await Integration.findOne({ userId, provider: 'google_analytics' });
    if (!integration) {
      throw new Error('Google Analytics not connected');
    }
    
    const auth = await getAuthenticatedClient(integration);
    const analytics = google.analytics({ version: 'v3', auth });
    
    const profileId = viewId || integration.defaultPropertyId || integration.properties[0]?.id;
    if (!profileId) {
      throw new Error('No Analytics view available');
    }
    
    // Default to last 30 days
    const endDate = dateRange?.endDate || new Date().toISOString().split('T')[0];
    const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data } = await analytics.data.ga.get({
      ids: `ga:${profileId}`,
      'start-date': startDate,
      'end-date': endDate,
      metrics: 'ga:sessions,ga:users,ga:bounceRate,ga:avgSessionDuration',
      dimensions: 'ga:date'
    });
    
    // Update last sync
    integration.lastSyncAt = new Date();
    integration.syncStatus = 'active';
    await integration.save();
    
    return {
      viewId: profileId,
      dateRange: { startDate, endDate },
      totals: {
        sessions: data.totalsForAllResults['ga:sessions'] || '0',
        users: data.totalsForAllResults['ga:users'] || '0',
        bounceRate: data.totalsForAllResults['ga:bounceRate'] || '0.00',
        avgSessionDuration: data.totalsForAllResults['ga:avgSessionDuration'] || '0'
      },
      rows: data.rows || []
    };
  } catch (error) {
    console.error('Error fetching Analytics data:', error);
    throw error;
  }
}

module.exports = {
  getAuthUrl,
  connectGoogleAccount,
  refreshAccessToken,
  fetchSearchConsoleData,
  fetchAnalyticsData,
  fetchAndStoreGSCProperties,
  fetchAndStoreGAProperties
};

