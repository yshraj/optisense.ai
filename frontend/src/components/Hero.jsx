import { useState, useEffect } from 'react';
import { FiArrowRight, FiCheck, FiSearch, FiCode, FiZap } from 'react-icons/fi';
import { SiOpenai, SiGoogle } from 'react-icons/si';

export default function Hero({ onAnalyze, loading, user, isPremium = false, onShowLogin }) {
  const [url, setUrl] = useState('');
  const [brand, setBrand] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [analysisStep, setAnalysisStep] = useState(0);
  
  // Hide form when loading starts
  useEffect(() => {
    if (loading) {
      setShowForm(false);
      // Cycle through analysis steps
      const steps = [
        'Fetching website data...',
        'Analyzing SEO metrics...',
        'Testing AI model visibility...',
        'Generating recommendations...'
      ];
      let stepIndex = 0;
      setAnalysisStep(0);
      const interval = setInterval(() => {
        stepIndex = (stepIndex + 1) % steps.length;
        setAnalysisStep(stepIndex);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setShowForm(true);
    }
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    // Pass optional context data along with URL
    const context = {
      brand: brand.trim(),
      industry: industry.trim(),
      description: description.trim()
    };
    
    await onAnalyze(url, context);
  };

  return (
    <section className={`hero ${loading ? 'loading' : ''}`}>
      {/* Animated Background */}
      <div className="hero-bg-gradient"></div>
      {loading && (
        <div className="analysis-gradient-overlay">
          <div className="gradient-animation"></div>
        </div>
      )}
      <div className="hero-bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className="container">
        <div className="hero-content">
          {/* Main Headline */}
          <div className="hero-text text-center">
            <h1 className="hero-title">
              Discover Your Brand's Visibility<br />
              <span className="gradient-text">in the AI Search Era</span>
            </h1>
            
            <p className="hero-subtitle">
              Analyze your SEO health and track how ChatGPT, Claude, and Gemini 
              recommend your website. Get actionable insights in seconds.
            </p>
          </div>

          {/* URL Input Form */}
          <div className="hero-cta">
            {showForm && !loading ? (
              <form onSubmit={handleSubmit} className={`url-input-form ${loading ? 'fade-out' : 'fade-in'}`}>
                <div className="input-group">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-website.com"
                    className="url-input"
                    required
                    disabled={loading}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-large"
                    disabled={loading}
                  >
                    Analyze Now
                    <FiArrowRight />
                  </button>
                </div>
                
                {/* Optional Context Fields */}
                <button
                  type="button"
                  className="optional-fields-toggle"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  disabled={loading}
                >
                  {showOptionalFields ? '− Hide optional fields' : '+ Add brand/industry context (optional)'}
                </button>
                
                {showOptionalFields && (
                  <div className="optional-fields-container">
                    <div className="optional-field">
                      <label htmlFor="brand">Brand Name (optional)</label>
                      <input
                        id="brand"
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="e.g., Nike, Shopify"
                        className="optional-input"
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="optional-field">
                      <label htmlFor="industry">Industry (optional)</label>
                      <input
                        id="industry"
                        type="text"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="e.g., E-commerce, SaaS, Healthcare"
                        className="optional-input"
                        disabled={loading}
                      />
                    </div>
                    
                    <div className="optional-field">
                      <label htmlFor="description">Description (optional)</label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of your business or product..."
                        className="optional-textarea"
                        disabled={loading}
                        rows="3"
                      />
                    </div>
                    
                    <p className="optional-hint">
                      <FiCheck size={14} />
                      Adding context helps our AI provide more accurate and relevant recommendations
                    </p>
                  </div>
                )}
              </form>
            ) : loading ? (
              <div className="analysis-loading-container fade-in">
                <div className="analysis-loader">
                  <div className="loader-circle">
                    <div className="loader-spinner"></div>
                    <div className="loader-pulse"></div>
                  </div>
                  <h3 className="analysis-title">Analyzing Your Website</h3>
                  <p className="analysis-step">
                    {analysisStep === 0 && (
                      <>
                        <FiSearch className="step-icon" />
                        Fetching website data...
                      </>
                    )}
                    {analysisStep === 1 && (
                      <>
                        <FiCode className="step-icon" />
                        Analyzing SEO metrics...
                      </>
                    )}
                    {analysisStep === 2 && (
                      <>
                        <FiZap className="step-icon" />
                        Testing AI model visibility...
                      </>
                    )}
                    {analysisStep === 3 && (
                      <>
                        <FiCheck className="step-icon" />
                        Generating recommendations...
                      </>
                    )}
                  </p>
                  <div className="analysis-progress">
                    <div className="progress-bar">
                      <div className="progress-fill"></div>
                    </div>
                    <p className="progress-hint">This usually takes 20-30 seconds</p>
                  </div>
                </div>
              </div>
            ) : null}

            {showForm && !loading && (
              <>
                <p className="input-hint">
                  <FiCheck className="check-icon" />
                  {user ? (
                    <>
                      {!isPremium && (
                        <>
                          {user.attemptsUsed !== undefined && (
                            <span>
                              {3 - user.attemptsUsed} scan{3 - user.attemptsUsed !== 1 ? 's' : ''} remaining • 
                            </span>
                          )}
                          {' '}
                          Results in 30 seconds
                        </>
                      )}
                      {isPremium && 'Premium analysis • Unlimited scans'}
                    </>
                  ) : (
                    <>
                      Free analysis • No credit card required • Results in 30 seconds
                    </>
                  )}
                </p>
                
                {!user && (
                  <div className="hero-login-prompt">
                    <p>Already have an account?</p>
                    <div className="hero-auth-buttons">
                      <button 
                        className="btn btn-primary"
                        onClick={onShowLogin}
                        type="button"
                      >
                        Sign In
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={onShowLogin}
                        type="button"
                      >
                        Sign Up
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Trust Badges */}
          <div className="hero-badges">
            <span className="badge-label">Analyzed by:</span>
            <div className="llm-badges">
              <div className="llm-badge">
                <SiOpenai />
                <span>ChatGPT</span>
              </div>
              <div className="llm-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm0-18a8 8 0 100 16 8 8 0 000-16z"/>
                </svg>
                <span>Claude</span>
              </div>
              <div className="llm-badge">
                <SiGoogle />
                <span>Gemini</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

