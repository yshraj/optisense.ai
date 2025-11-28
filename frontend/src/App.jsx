import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import ResultsDisplay from './components/ResultsDisplay';
import OTPLoginModal from './components/OTPLoginModal';
import ScanHistory from './components/ScanHistory';
import CompetitorComparison from './components/CompetitorComparison';
import PricingComparison from './components/PricingComparison';
import AccountSection from './components/AccountSection';
import './styles/globals.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Generate or retrieve visitor ID
function getOrCreateVisitorId() {
  // Check localStorage first
  let visitorId = localStorage.getItem('visitor_id');
  
  if (!visitorId) {
    // Generate new visitor ID
    visitorId = crypto.randomUUID() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('visitor_id', visitorId);
  }
  
  // Also set in cookie (for httpOnly access, backend will read from request)
  // Note: We can't set httpOnly cookies from frontend, so we'll send visitorId in request body
  document.cookie = `visitor_id=${visitorId}; path=/; max-age=${30 * 24 * 60 * 60}`; // 30 days
  
  return visitorId;
}

// Generate device fingerprint
function generateFingerprint() {
  return {
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    platform: navigator.platform,
    cores: navigator.hardwareConcurrency || 'unknown',
    visitorId: getOrCreateVisitorId()
  };
}

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showScanHistory, setShowScanHistory] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [fingerprint] = useState(generateFingerprint());
  const [visitorId] = useState(getOrCreateVisitorId());
  const isOpeningRef = useRef(false);
  
  // Check if user is premium
  const isPremium = user?.isPremium && 
    (!user?.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());

  // Check auth on mount
  useEffect(() => {
    if (token) {
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setUser(response.data.user);
        // Refresh premium status
      } else {
        // Invalid token
        setToken(null);
        localStorage.removeItem('auth_token');
      }
    } catch (err) {
      // Not authenticated
      setToken(null);
      localStorage.removeItem('auth_token');
    }
  };

  const handleAnalyze = async (url, context = {}) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('Analyzing:', url, context);
      
      const requestData = {
        url,
        visitorId,
        fingerprint,
        // Include optional context if provided
        ...(context.brand && { brandName: context.brand }),
        ...(context.industry && { industry: context.industry }),
        ...(context.description && { description: context.description })
      };
      
      const config = token ? {
        headers: {
          Authorization: `Bearer ${token}`
        }
      } : {};
      
      const response = await axios.post(`${API_URL}/api/analyze`, requestData, config);
      console.log('Response:', response.data);
      
      // Store result with tier information and warnings
      setResults({
        ...response.data.result,
        scanId: response.data.scanId,
        isFreeUser: response.data.isFreeUser,
        isPremium: response.data.isPremium,
        warnings: response.data.warnings
      });
      
      // Show warnings as informational messages (not errors)
      if (response.data.warnings && response.data.warnings.length > 0) {
        console.warn('Analysis completed with warnings:', response.data.warnings);
        // Don't set error - warnings are informational, analysis still succeeded
      }
      
      // Update user state if authenticated and attempts were used
      if (response.data.attemptsUsed !== undefined && user) {
        setUser(prev => ({
          ...prev,
          attemptsUsed: response.data.attemptsUsed
        }));
      }
      
      // Check if auth is required
      if (response.data.requiresAuth || response.status === 403) {
        setShowLoginModal(true);
        return;
      }
      
      // Scroll to results
      setTimeout(() => {
        document.querySelector('.results-container')?.scrollIntoView({ 
          behavior: 'smooth' 
        });
      }, 100);
    } catch (err) {
      const errorData = err.response?.data;
      
      // Check if auth is required
      if (errorData?.requiresAuth) {
        setShowLoginModal(true);
        setError(null); // Don't show error, show login modal instead
      } else {
        let errorMessage = errorData?.error || 'Analysis failed. Please try again.';
        // Improve timeout error messages
        if (errorMessage.includes('timeout') || errorMessage.includes('exceeded')) {
          errorMessage = 'Our servers are temporarily experiencing high load. Please try again in a few moments.';
        }
        setError(errorMessage);
      }
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('auth_token', newToken);
    setShowLoginModal(false);
    
    // Retry the last analysis if there was one
    if (error && error.includes('free scan')) {
      setError(null);
    }
  };

  const handleLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    axios.post(`${API_URL}/api/auth/logout`);
  }, []);

  const handleShowHistory = useCallback(() => {
    // Prevent rapid clicking
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    
    // Close other modals/sections first with smooth transition
    setShowAccount(false);
    setShowCompare(false);
    // Use setTimeout to allow closing animation before opening
    setTimeout(() => {
      setShowScanHistory(true);
      setTimeout(() => {
        isOpeningRef.current = false;
      }, 500);
    }, 100);
  }, []);

  const handleShowLogin = useCallback(() => {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    setShowLoginModal(true);
    setTimeout(() => {
      isOpeningRef.current = false;
    }, 300);
  }, []);

  const handleShowCompare = useCallback(() => {
    // Prevent rapid clicking
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    
    // Close other modals/sections first with smooth transition
    setShowAccount(false);
    setShowScanHistory(false);
    // Use setTimeout to allow closing animation before opening
    setTimeout(() => {
      setShowCompare(true);
      setTimeout(() => {
        isOpeningRef.current = false;
      }, 500);
    }, 100);
  }, []);

  const handleShowAccount = useCallback(() => {
    // Prevent rapid clicking
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    
    // Close other modals/sections first with smooth transition
    setShowScanHistory(false);
    setShowCompare(false);
    // Use setTimeout to allow closing animation before opening
    setTimeout(() => {
      setShowAccount(true);
      setTimeout(() => {
        isOpeningRef.current = false;
      }, 500);
    }, 100);
  }, []);

  return (
    <div className="app">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        token={token}
        isPremium={isPremium}
        onShowHistory={handleShowHistory}
        onShowLogin={handleShowLogin}
        onShowCompare={handleShowCompare}
        onShowAccount={handleShowAccount}
      />
      <Hero 
        onAnalyze={handleAnalyze} 
        loading={loading} 
        user={user}
        isPremium={isPremium}
        onShowLogin={handleShowLogin}
      />
      
      {error && !error.includes('free scan') && (
        <div className="container">
          <div className="error-banner">
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {results && <ResultsDisplay data={results} />}
      <HowItWorks />
      <Features />
      <PricingComparison />
      
      {showScanHistory && (
        <ScanHistory 
          isOpen={showScanHistory} 
          onClose={() => setShowScanHistory(false)}
          token={token}
        />
      )}
      
      <OTPLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleAuthSuccess}
        fingerprint={fingerprint}
      />
      
      <CompetitorComparison
        isOpen={showCompare}
        onClose={() => setShowCompare(false)}
        token={token}
        isPremium={isPremium}
      />
      
      <AccountSection
        isOpen={showAccount}
        onClose={() => setShowAccount(false)}
        token={token}
        user={user}
        onUserUpdate={(updatedUser) => setUser(updatedUser)}
      />
    </div>
  );
}

export default App;

