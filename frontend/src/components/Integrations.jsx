import { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCheckCircle, FiX, FiAlertCircle, FiRefreshCw, FiExternalLink, FiLoader } from 'react-icons/fi';

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/integrations`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setIntegrations(response.data.integrations);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setError('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider) => {
    try {
      setConnecting(true);
      setError(null);

      // Get authorization URL
      const response = await axios.get(`${API_URL}/api/integrations/google/connect?provider=${provider}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // Redirect to Google OAuth
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      setError('Failed to connect. Please try again.');
      setConnecting(false);
    }
  };

  const handleDisconnect = async (integrationId) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/integrations/${integrationId}/disconnect`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Refresh integrations list
        fetchIntegrations();
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      setError('Failed to disconnect. Please try again.');
    }
  };

  const getProviderName = (provider) => {
    switch (provider) {
      case 'google_search_console':
        return 'Google Search Console';
      case 'google_analytics':
        return 'Google Analytics';
      default:
        return provider;
    }
  };

  const getProviderIcon = (provider) => {
    return '🔍'; // Simple icon, can be replaced with actual icons
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="integrations-container">
        <div className="loading-state">
          <FiLoader className="spinner" />
          <p>Loading integrations...</p>
        </div>
      </div>
    );
  }

  const gscIntegration = integrations.find(i => i.provider === 'google_search_console');
  const gaIntegration = integrations.find(i => i.provider === 'google_analytics');

  return (
    <div className="integrations-container">
      <div className="integrations-header">
        <h2>Google Integrations</h2>
        <p>Connect your Google Search Console and Analytics accounts to see data in your scan results</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      <div className="integrations-grid">
        {/* Google Search Console */}
        <div className="integration-card">
          <div className="integration-header">
            <div className="integration-icon">🔍</div>
            <div>
              <h3>Google Search Console</h3>
              <p>View top queries, impressions, and clicks</p>
            </div>
          </div>

          {gscIntegration ? (
            <div className="integration-status connected">
              <div className="status-info">
                <FiCheckCircle className="status-icon success" />
                <div>
                  <strong>Connected</strong>
                  <p>Last synced: {formatDate(gscIntegration.lastSyncAt)}</p>
                  {gscIntegration.properties && gscIntegration.properties.length > 0 && (
                    <p className="property-info">
                      {gscIntegration.properties.length} propert{gscIntegration.properties.length !== 1 ? 'ies' : 'y'} connected
                    </p>
                  )}
                </div>
              </div>
              <div className="integration-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchIntegrations()}
                  title="Refresh"
                >
                  <FiRefreshCw />
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDisconnect(gscIntegration._id)}
                >
                  <FiX /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="integration-status disconnected">
              <p>Not connected</p>
              <button
                className="btn btn-primary"
                onClick={() => handleConnect('google_search_console')}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <FiLoader className="spinner" /> Connecting...
                  </>
                ) : (
                  <>
                    Connect Search Console
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Google Analytics */}
        <div className="integration-card">
          <div className="integration-header">
            <div className="integration-icon">📊</div>
            <div>
              <h3>Google Analytics</h3>
              <p>View traffic, sessions, and user metrics</p>
            </div>
          </div>

          {gaIntegration ? (
            <div className="integration-status connected">
              <div className="status-info">
                <FiCheckCircle className="status-icon success" />
                <div>
                  <strong>Connected</strong>
                  <p>Last synced: {formatDate(gaIntegration.lastSyncAt)}</p>
                  {gaIntegration.properties && gaIntegration.properties.length > 0 && (
                    <p className="property-info">
                      {gaIntegration.properties.length} view{gaIntegration.properties.length !== 1 ? 's' : ''} connected
                    </p>
                  )}
                </div>
              </div>
              <div className="integration-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => fetchIntegrations()}
                  title="Refresh"
                >
                  <FiRefreshCw />
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDisconnect(gaIntegration._id)}
                >
                  <FiX /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="integration-status disconnected">
              <p>Not connected</p>
              <button
                className="btn btn-primary"
                onClick={() => handleConnect('google_analytics')}
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <FiLoader className="spinner" /> Connecting...
                  </>
                ) : (
                  <>
                    Connect Analytics
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="integrations-info">
        <h4>How it works</h4>
        <ul>
          <li>Click "Connect" to authorize access to your Google account</li>
          <li>You'll be redirected to Google to grant permissions</li>
          <li>Once connected, your scan results will include Search Console and Analytics data</li>
          <li>Data is synced automatically when you run a scan</li>
          <li>You can disconnect at any time</li>
        </ul>
        <p className="note">
          <strong>Note:</strong> Integrations are available for Professional tier users only.
        </p>
      </div>
    </div>
  );
}

