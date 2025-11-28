const crypto = require('crypto');
const nodemailer = require('nodemailer');
const OTPRateLimit = require('../models/OTPRateLimit');
const { getHashedIP } = require('./ipService');

// Disposable email domains (common ones)
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com'
];

/**
 * Check if email is from disposable domain
 */
function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

/**
 * Generate 6-digit OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check OTP rate limits
 * @param {String} email - User email
 * @param {String} ipHash - Hashed IP address
 * @returns {Object} - { allowed: boolean, message?: string }
 */
async function checkOTPRateLimit(email, ipHash) {
  const oneHourAgo = new Date(Date.now() - 3600000);
  
  // Check IP-based rate limit (max 5 per hour)
  const ipLimit = await OTPRateLimit.findOne({
    ipHash,
    windowStart: { $gte: oneHourAgo }
  });
  
  if (ipLimit && ipLimit.count >= 5) {
    return {
      allowed: false,
      message: 'Too many OTP requests from this IP. Please try again in an hour.'
    };
  }
  
  // Check email-based rate limit (max 3 per hour)
  const emailLimit = await OTPRateLimit.findOne({
    email: email.toLowerCase(),
    windowStart: { $gte: oneHourAgo }
  });
  
  if (emailLimit && emailLimit.count >= 3) {
    return {
      allowed: false,
      message: 'Too many OTP requests for this email. Please try again in an hour.'
    };
  }
  
  return { allowed: true };
}

/**
 * Record OTP request for rate limiting
 */
async function recordOTPRequest(email, ipHash) {
  const oneHourAgo = new Date(Date.now() - 3600000);
  
  // Update or create IP limit
  await OTPRateLimit.findOneAndUpdate(
    {
      ipHash,
      windowStart: { $gte: oneHourAgo }
    },
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStart: new Date() }
    },
    { upsert: true, new: true }
  );
  
  // Update or create email limit
  await OTPRateLimit.findOneAndUpdate(
    {
      email: email.toLowerCase(),
      windowStart: { $gte: oneHourAgo }
    },
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStart: new Date() }
    },
    { upsert: true, new: true }
  );
}

/**
 * Create email transporter (using Gmail SMTP)
 */
function createEmailTransporter() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials not configured');
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    // Additional options for better deliverability
    tls: {
      rejectUnauthorized: false // For development, set to true in production
    }
  });
}

/**
 * Send OTP email
 */
async function sendOTPEmail(email, otpCode) {
  const hasSMTPConfig = process.env.SMTP_USER;
  
  // If no SMTP configured, log OTP (for development)
  if (!hasSMTPConfig) {
    console.log('\n' + '='.repeat(60));
    console.log(`📧 OTP for ${email}: ${otpCode}`);
    console.log('⚠️  SMTP not configured. OTP logged above for development.');
    console.log('💡 To enable email sending, configure SMTP_USER and SMTP_PASS in .env');
    console.log('='.repeat(60) + '\n');
    return true;
  }
  
  try {
    const transporter = createEmailTransporter();
    
    // Skip verification in production for faster OTP sending
    // Verification can be done asynchronously if needed
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Verifying SMTP connection...');
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    }
    
    const smtpUser = process.env.SMTP_USER;
    // Use SMTP_FROM if provided, otherwise use SMTP_USER
    const fromEmail = process.env.SMTP_FROM || smtpUser;
    
    const mailOptions = {
      from: fromEmail.includes('<') ? fromEmail : `OptiSenseAI <${fromEmail}>`,
      to: email,
      subject: 'Your OptiSenseAI Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366F1; margin-bottom: 20px;">Verify Your Email</h2>
          <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Your verification code is:</p>
          <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 30px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: white; margin: 30px 0; border-radius: 8px;">
            ${otpCode}
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
      text: `Your OptiSenseAI verification code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
    };
    
    console.log(`📤 Sending email from: ${mailOptions.from}`);
    console.log(`📥 Sending email to: ${email}`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`💡 Important: Check spam/junk folder if email not received`);
    
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    console.error('Full error:', error);
    
    // Provide more specific error messages
    if (error.code === 'EAUTH') {
      throw new Error('SMTP authentication failed. Please check your SMTP credentials.');
    } else if (error.code === 'ECONNECTION') {
      throw new Error('Could not connect to SMTP server. Please check your SMTP host and port.');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('SMTP connection timed out. Please check your network connection.');
    } else {
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }
}

/**
 * Send OTP to user
 */
async function sendOTP(email, req) {
  // Check disposable email
  if (isDisposableEmail(email)) {
    throw new Error('Disposable email addresses are not allowed');
  }
  
  // Get IP hash
  const ipHash = getHashedIP(req);
  
  // Check rate limits
  const rateLimitCheck = await checkOTPRateLimit(email, ipHash);
  if (!rateLimitCheck.allowed) {
    throw new Error(rateLimitCheck.message);
  }
  
  // Generate OTP
  const otpCode = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  // Send email
  await sendOTPEmail(email, otpCode);
  
  // Record request
  await recordOTPRequest(email, ipHash);
  
  return {
    otpCode, // In production, don't return this - only for development
    otpExpiresAt
  };
}

/**
 * Verify OTP code
 */
function verifyOTP(storedOTP, storedExpiresAt, providedOTP) {
  if (!storedOTP || !storedExpiresAt) {
    return false;
  }
  
  if (new Date() > storedExpiresAt) {
    return false;
  }
  
  return storedOTP === providedOTP;
}

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  checkOTPRateLimit,
  isDisposableEmail
};

