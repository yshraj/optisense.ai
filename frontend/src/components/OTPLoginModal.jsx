import { useState, useEffect } from 'react';
import { FiX, FiMail, FiLock, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import IndustryDropdown from './IndustryDropdown';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OTPLoginModal({ isOpen, onClose, onSuccess, fingerprint }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'register'
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [brandName, setBrandName] = useState('');
  const [country, setCountry] = useState('');
  const [brandSummary, setBrandSummary] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('email');
      setMode('login');
      setEmail('');
      setOtp('');
      setBrandName('');
      setCountry('');
      setBrandSummary('');
      setIndustry('');
      setError('');
      setMessage('');
      setIsNewUser(false);
    }
  }, [isOpen]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    // Validate email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }
    
    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (trimmedEmail.length > 254) {
      setError('Email address is too long');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/api/auth/send-otp`, { 
        email: trimmedEmail,
        mode 
      });
      
      if (response.data.success) {
        setEmail(trimmedEmail); // Store normalized email
        
        // NEVER show OTP in UI - security risk
        // OTP should only be sent via email
        setMessage('OTP sent to your email! Please check your inbox.');
        
        setStep('otp');
      }
    } catch (err) {
      const errorData = err.response?.data;
      let errorMsg = errorData?.error || 'Failed to send OTP. Please try again.';
      
      // Handle specific error cases
      if (errorData?.existingAccount) {
        // User trying to signup with existing email
        setMode('login');
        errorMsg = 'An account with this email already exists. Please sign in instead.';
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
        errorMsg = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (errorMsg.includes('disposable')) {
        errorMsg = 'Disposable email addresses are not allowed. Please use a valid email.';
      } else if (err.message === 'Network Error' || !err.response) {
        errorMsg = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    
    // Validate OTP is numeric
    if (!/^\d{6}$/.test(trimmedOtp)) {
      setError('OTP must contain only numbers');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        email: email.trim(),
        otp: trimmedOtp,
        fingerprint
      });

      if (response.data.success) {
        // Check if registration is needed
        if (response.data.requiresRegistration || !response.data.user.brandName) {
          setStep('register');
          setIsNewUser(true);
          setMessage('Please complete your profile');
        } else {
          // Login successful
          onSuccess(response.data.token, response.data.user);
          onClose();
        }
      }
    } catch (err) {
      const errorData = err.response?.data;
      let errorMsg = errorData?.error || 'Invalid OTP. Please try again.';
      
      // Handle specific error cases
      if (errorMsg.includes('expired')) {
        errorMsg = 'OTP has expired. Please request a new code.';
        // Optionally go back to email step
        setTimeout(() => {
          setStep('email');
          setOtp('');
        }, 2000);
      } else if (errorMsg.includes('Invalid') || errorMsg.includes('not found')) {
        errorMsg = 'Invalid OTP code. Please check and try again.';
      } else if (errorMsg.includes('brand') || errorMsg.includes('country')) {
        setStep('register');
        setIsNewUser(true);
        errorMsg = 'Please complete your profile to continue';
      } else if (err.message === 'Network Error' || !err.response) {
        errorMsg = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    
    // Validate and sanitize inputs
    const trimmedBrandName = brandName.trim();
    const trimmedCountry = country.trim();
    
    if (!trimmedBrandName || !trimmedCountry) {
      setError('Please fill in all fields');
      return;
    }
    
    if (trimmedBrandName.length < 2) {
      setError('Brand name must be at least 2 characters long');
      return;
    }
    
    if (trimmedCountry.length < 2) {
      setError('Country name must be at least 2 characters long');
      return;
    }
    
    if (trimmedBrandName.length > 100) {
      setError('Brand name is too long (max 100 characters)');
      return;
    }
    
    if (trimmedCountry.length > 100) {
      setError('Country name is too long (max 100 characters)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Complete registration - OTP already verified, just need brand/country
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        email: email.trim(),
        otp: otp || 'completed', // Send OTP if available, or placeholder since user is already verified
        brandName: trimmedBrandName,
        country: trimmedCountry,
        brandSummary: brandSummary.trim() || undefined,
        industry: industry || undefined,
        fingerprint
      });

      if (response.data.success) {
        onSuccess(response.data.token, response.data.user);
        onClose();
      }
    } catch (err) {
      const errorData = err.response?.data;
      let errorMsg = errorData?.error || 'Failed to complete registration';
      
      // Handle specific error cases
      if (errorMsg.includes('expired') || errorMsg.includes('Invalid') || errorMsg.includes('not found')) {
        setStep('email');
        setOtp('');
        errorMsg = 'Session expired. Please start over.';
      } else if (errorMsg.includes('at least')) {
        // Validation error from backend
      } else if (err.message === 'Network Error' || !err.response) {
        errorMsg = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <FiX />
        </button>

        <div className="modal-header">
          {step === 'email' && (
            <div className="auth-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={`mode-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
              >
                Sign Up
              </button>
            </div>
          )}
          <h2>
            {step === 'email' && (mode === 'login' ? 'Welcome Back' : 'Create Account')}
            {step === 'otp' && 'Enter Verification Code'}
            {step === 'register' && 'Complete Your Profile'}
          </h2>
          <p>
            {step === 'email' && (mode === 'login' 
              ? 'Sign in to access your scan history and continue analyzing'
              : 'Create a free account to get started with unlimited scans')}
            {step === 'otp' && `We sent a 6-digit code to ${email}`}
            {step === 'register' && 'Tell us a bit about yourself'}
          </p>
        </div>

        {error && (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        )}

        {message && (
          <div className="success-banner">
            <FiCheck />
            <p>{message}</p>
          </div>
        )}

        <div className="modal-body">
          {step === 'email' && (
            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label>
                  <FiMail />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(''); // Clear error on input change
                  }}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                  maxLength={254}
                  autoComplete="email"
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary btn-block" 
                disabled={loading || !email.trim()}
              >
                {loading ? 'Sending...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
              {step === 'email' && (
                <p className="auth-switch-text">
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                          setMode('signup');
                          setError('');
                        }}
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                          setMode('login');
                          setError('');
                        }}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              )}
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label>
                  <FiLock />
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  required
                  disabled={loading}
                  className="otp-input"
                />
                <p className="form-hint">Check your email for the 6-digit code</p>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary btn-block" 
                disabled={loading || otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                type="button"
                className="btn btn-text"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError('');
                }}
                disabled={loading}
              >
                Change email
              </button>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleCompleteRegistration}>
              <div className="form-group">
                <label>Brand/Company Name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => {
                    setBrandName(e.target.value.slice(0, 100));
                    setError('');
                  }}
                  placeholder="Your Brand Name"
                  required
                  disabled={loading}
                  maxLength={100}
                  minLength={2}
                  autoComplete="organization"
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value.slice(0, 100));
                    setError('');
                  }}
                  placeholder="Your Country"
                  required
                  disabled={loading}
                  maxLength={100}
                  minLength={2}
                  autoComplete="country-name"
                />
              </div>
              
              <div className="form-group">
                <label>
                  Brand Summary <span className="optional-label">(Optional but highly useful)</span>
                </label>
                <textarea
                  value={brandSummary}
                  onChange={(e) => {
                    setBrandSummary(e.target.value.slice(0, 500));
                    setError('');
                  }}
                  placeholder="Write 1–2 sentences describing what your brand does."
                  disabled={loading}
                  maxLength={500}
                  rows={3}
                  className="textarea-input"
                />
                <div className="char-count">{brandSummary.length}/500</div>
              </div>
              
              <div className="form-group">
                <label>
                  Primary Topic or Industry <span className="optional-label">(Optional)</span>
                </label>
                <IndustryDropdown
                  value={industry}
                  onChange={setIndustry}
                  disabled={loading}
                />
                <small className="form-hint">Helps with competitor detection and topic-alignment prompts</small>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary btn-block" 
                disabled={loading || !brandName.trim() || !country.trim()}
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

