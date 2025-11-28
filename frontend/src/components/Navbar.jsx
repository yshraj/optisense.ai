import { useState, useEffect } from 'react';
import { FiMoon, FiSun, FiMenu, FiX, FiUser, FiLogOut, FiClock, FiBarChart2 } from 'react-icons/fi';

export default function Navbar({ user, onLogout, token, onShowHistory, onShowLogin, onShowCompare, onShowAccount, isPremium }) {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get user initials for avatar
  const getUserInitials = (email) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          {/* Logo */}
          <a 
            href="/" 
            className="navbar-logo"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              window.location.href = '/';
            }}
            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="8" fill="url(#logoGradient)"/>
                <path d="M16 8L20 14H24L18 20L20 26L16 22L12 26L14 20L8 14H12L16 8Z" fill="white"/>
                <circle cx="16" cy="16" r="2" fill="white" opacity="0.8"/>
              </svg>
            </div>
            <span className="logo-text">OptiSenseAI</span>
          </a>

          {/* Desktop Navigation */}
          <div className="navbar-links">
            <a 
              href="#features" 
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              How It Works
            </a>
            
            {/* Dark Mode Toggle */}
            <button 
              className="theme-toggle" 
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>
            
            {user ? (
              <div className="user-menu">
                <button 
                  className="btn btn-text" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onShowAccount) {
                      onShowAccount();
                    }
                  }}
                  title="Account settings"
                >
                  <FiUser size={16} />
                  Account
                </button>
                <button 
                  className="btn btn-text" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onShowHistory) {
                      onShowHistory();
                    }
                  }}
                  title="View scan history"
                >
                  <FiClock size={16} />
                  Past Scans
                </button>
                {isPremium && onShowCompare && (
                  <button 
                    className="btn btn-text" 
                    onClick={onShowCompare}
                    title="Compare competitors"
                  >
                    <FiBarChart2 size={16} />
                    Compare
                  </button>
                )}
                <button className="btn btn-text" onClick={onLogout}>
                  <FiLogOut size={16} />
                  Logout
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={(e) => {
                  e.preventDefault();
                  if (onShowLogin) {
                    onShowLogin();
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                Get Started
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <a 
              href="#features" 
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              How It Works
            </a>
            {user ? (
              <>
                <div className="user-info-mobile">
                  <div className="user-avatar">
                    {getUserInitials(user.email)}
                  </div>
                  {user.attemptsUsed !== undefined && (
                    <span className="attempts-badge">
                      {user.attemptsUsed}/3 scans
                    </span>
                  )}
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onShowAccount) {
                      onShowAccount();
                    }
                    setMobileMenuOpen(false);
                  }}
                  style={{ width: '100%', marginBottom: '8px' }}
                >
                  <FiUser size={16} />
                  Account
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onShowHistory) {
                      onShowHistory();
                    }
                    setMobileMenuOpen(false);
                  }}
                  style={{ width: '100%', marginBottom: '8px' }}
                >
                  <FiClock size={16} />
                  View History
                </button>
                <button className="btn btn-text" onClick={onLogout} style={{ width: '100%' }}>
                  <FiLogOut size={16} />
                  Logout
                </button>
              </>
            ) : (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  if (onShowLogin) {
                    onShowLogin();
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                Get Started
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

