import { useState, useEffect, useRef } from 'react';
import { FiUser, FiStar, FiCalendar, FiMail, FiGlobe, FiX, FiLink } from 'react-icons/fi';
import axios from 'axios';
import Integrations from './Integrations';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AccountSection({ isOpen, onClose, token, user: initialUser, onUserUpdate }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('account'); // 'account' or 'integrations'
  const sectionRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch user data if token is available
      if (token) {
        fetchUserData();
      }
      
      // Check for OAuth callback parameters
      const urlParams = new URLSearchParams(window.location.search);
      const integration = urlParams.get('integration');
      if (integration === 'success') {
        setActiveTab('integrations');
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
      
      // Smooth scroll to section with offset for navbar
      const scrollToSection = () => {
        if (sectionRef.current) {
          const element = sectionRef.current;
          const navbarHeight = 80; // Approximate navbar height
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - navbarHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      };

      // Use requestAnimationFrame for smoother animation
      const scrollTimer = requestAnimationFrame(() => {
        setTimeout(scrollToSection, 100);
      });
      
      return () => {
        cancelAnimationFrame(scrollTimer);
      };
    }
  }, [isOpen, token]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setUser(response.data.user);
        if (onUserUpdate) {
          onUserUpdate(response.data.user);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  if (!isOpen) return null;

  const isPremium = user?.isPremium && 
    (!user?.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUserInitials = (email) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="account-section section" ref={sectionRef}>
      <div className="container">
        <div className="account-header">
          <div>
            <h2>Account Settings</h2>
            <p>Manage your account and subscription</p>
          </div>
          <button className="btn-close-account" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="account-tabs">
          <button
            className={`account-tab ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <FiUser size={18} />
            Account
          </button>
          <button
            className={`account-tab ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            <FiLink size={18} />
            Integrations
          </button>
        </div>

        <div className="account-content">
          {activeTab === 'account' ? (
            <>
          {/* Account Status Card */}
          <div className="account-card">
            <div className="account-status-header">
              <div className="account-avatar-large">
                {getUserInitials(user?.email)}
              </div>
              <div className="account-status-info">
                <h3>{user?.brandName || 'Your Account'}</h3>
                <p className="account-email">
                  <FiMail size={14} />
                  {user?.email}
                </p>
                {isPremium ? (
                  <div className="premium-badge-large">
                    <FiStar size={16} />
                    <span>Premium Member</span>
                  </div>
                ) : (
                  <div className="free-badge">
                    <span>Free Plan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="account-card">
            <h4>Account Details</h4>
            <div className="account-details-grid">
              <div className="account-detail-item">
                <div className="detail-label">
                  <FiMail size={16} />
                  Email
                </div>
                <div className="detail-value">{user?.email || 'N/A'}</div>
              </div>
              
              {user?.brandName && (
                <div className="account-detail-item">
                  <div className="detail-label">
                    <FiUser size={16} />
                    Brand Name
                  </div>
                  <div className="detail-value">{user.brandName}</div>
                </div>
              )}
              
              {user?.country && (
                <div className="account-detail-item">
                  <div className="detail-label">
                    <FiGlobe size={16} />
                    Country
                  </div>
                  <div className="detail-value">{user.country}</div>
                </div>
              )}
              
              <div className="account-detail-item">
                <div className="detail-label">
                  <FiCalendar size={16} />
                  Member Since
                </div>
                <div className="detail-value">
                  {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="account-card">
            <h4>Subscription</h4>
            <div className="subscription-info">
              {isPremium ? (
                <>
                  <div className="subscription-status premium">
                    <FiStar size={20} />
                    <div>
                      <strong>Premium Plan</strong>
                      <p>
                        {user?.premiumExpiresAt 
                          ? `Expires on ${formatDate(user.premiumExpiresAt)}`
                          : 'Active subscription'}
                      </p>
                    </div>
                  </div>
                  <div className="subscription-note">
                    <p>Premium subscription is active. For subscription management, please contact support.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="subscription-status free">
                    <div>
                      <strong>Free Plan</strong>
                      <p>
                        {user?.attemptsUsed !== undefined 
                          ? `${3 - user.attemptsUsed} of 3 scans remaining this month`
                          : '3 scans per month'}
                      </p>
                    </div>
                  </div>
                  <div className="upgrade-notice">
                    <p>Premium subscriptions will be available soon. Stay tuned for updates!</p>
                    <button 
                      className="btn btn-primary"
                      disabled
                      style={{ opacity: 0.6, cursor: 'not-allowed', marginTop: '12px' }}
                      onClick={() => {
                        const pricingSection = document.getElementById('pricing');
                        if (pricingSection) {
                          pricingSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      Coming Soon
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="account-card">
            <h4>Usage Statistics</h4>
            <div className="usage-stats">
              <div className="usage-stat-item">
                <div className="stat-label">Scans Used</div>
                <div className="stat-value">
                  {user?.attemptsUsed !== undefined ? user.attemptsUsed : 0} / {isPremium ? '100' : '3'}
                </div>
                <div className="stat-progress">
                  <div 
                    className="stat-progress-bar" 
                    style={{ 
                      width: `${Math.min(100, ((user?.attemptsUsed || 0) / (isPremium ? 100 : 3)) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
            </>
          ) : (
            <div className="account-tab-content">
              <Integrations />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

