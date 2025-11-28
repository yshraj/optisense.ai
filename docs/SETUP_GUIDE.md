# OptiSenseAI - Complete Setup Guide

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [API Keys Setup](#api-keys-setup)
3. [Model Configuration](#model-configuration)
4. [Premium Features](#premium-features)
5. [Setting Premium Users](#setting-premium-users)
6. [Security & Production](#security--production)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- API Keys (see below)

### Installation

```bash
# 1. Backend Setup
cd backend
npm install
cp .env.template .env
# Edit .env with your API keys (see below)

# 2. Frontend Setup
cd ../frontend
npm install

# 3. Start MongoDB (Docker)
docker run -d -p 27017:27017 --name mongodb mongo:7

# 4. Start Backend
cd backend
npm run dev

# 5. Start Frontend (new terminal)
cd frontend
npm run dev

# 6. Open http://localhost:3000
```

---

## 🔑 API Keys Setup

### Required API Keys

#### 1. Google Gemini API Key (Required)
- **Get it:** https://makersuite.google.com/app/apikey
- **Free tier:** 60 requests/minute
- **Model used:** `gemini-2.5-flash` (only)
- **Add to `.env`:**
  ```env
  GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

#### 2. HuggingFace API Key (Optional - for Premium Features)
- **Get it:** https://huggingface.co/settings/tokens
- **Free tier:** 1,000 requests/month
- **Models used:**
  - Primary: `google/gemma-2-9b-it` (prompt generation)
  - Secondary: `Qwen/Qwen2.5-7B-Instruct` (analysis & fallback)
- **Add to `.env`:**
  ```env
  HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

#### 3. OpenRouter API Key (Optional - for Premium Features)
- **Get it:** https://openrouter.ai/keys
- **Free tier:** Limited free models
- **Models used:**
  - Primary: `deepseek/deepseek-r1:free` (reasoning)
  - Fallback: `mistralai/mistral-7b-instruct:free` (general)
- **Add to `.env`:**
  ```env
  OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

#### 4. MongoDB Connection
```env
MONGODB_URI=mongodb://localhost:27017/optisenseai
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/optisenseai
```

#### 5. JWT Secret (Required)
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

#### 6. SMTP (Optional - for Email OTP)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Note:** If SMTP is not configured, OTP will only be logged in development mode (never in production).

#### 7. Google OAuth (Required for Google Integrations - Professional Tier)
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/integrations/google/callback
ENCRYPTION_KEY=your_random_32_character_string_here
FRONTEND_URL=http://localhost:3000
```

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**Google Cloud Console Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable APIs:
   - Google Search Console API
   - Google Analytics Reporting API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:5000/api/integrations/google/callback`
5. Copy Client ID and Client Secret to `.env`

---

## 🤖 Model Configuration

### Model Assignment by Task

#### **Primary Analysis (All Users)**
- **Model:** Google Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Task:** Main LLM visibility analysis
- **Usage:** 3 prompts per scan (free users)
- **Why:** Fast, reliable, good JSON output, free tier

#### **Prompt Generation (Premium Only)**
- **Primary Model:** HuggingFace `google/gemma-2-9b-it` ✅
  - **Task:** Generate 10 business-specific prompts
  - **Why:** Excellent instruction following, good for structured output
  - **Free Tier:** 1,000 requests/month
- **Fallback Model:** HuggingFace `Qwen/Qwen2.5-7B-Instruct` ✅
  - **Task:** Backup if primary fails
  - **Why:** Reliable, good JSON parsing, cross-check capability

#### **Multi-LLM Analysis (Premium Only)**
For each of the 10 prompts, analyze with 3 LLMs:

1. **Google Gemini 2.5 Flash** (`gemini-2.5-flash`)
   - **Task:** Primary analysis
   - **Why:** Fast, reliable, good quality

2. **HuggingFace Qwen 2.5** (`Qwen/Qwen2.5-7B-Instruct`)
   - **Task:** Cross-check analysis
   - **Why:** Good structured JSON output, free tier

3. **OpenRouter DeepSeek R1** (`deepseek/deepseek-r1:free`) ✅
   - **Task:** Reasoning-based analysis (best for complex queries)
   - **Why:** Extremely powerful reasoning model, free tier
   - **Fallback:** `mistralai/mistral-7b-instruct:free` if DeepSeek fails

#### **SEO Recommendations (Premium Only)**
- **Model:** Google Gemini 2.5 Flash (`gemini-2.5-flash`)
- **Task:** Generate 10-15 actionable SEO recommendations
- **Why:** Good at structured recommendations with priorities

### Model Usage Summary

| Task | Model | Provider | Free Tier | Status |
|------|-------|----------|-----------|--------|
| Primary Analysis | gemini-2.5-flash | Google | 60 RPM | ✅ |
| Prompt Generation (Primary) | gemma-2-9b-it | HuggingFace | 1K/month | ✅ |
| Prompt Generation (Fallback) | Qwen2.5-7B-Instruct | HuggingFace | 1K/month | ✅ |
| Multi-LLM Analysis #1 | gemini-2.5-flash | Google | 60 RPM | ✅ |
| Multi-LLM Analysis #2 | Qwen2.5-7B-Instruct | HuggingFace | 1K/month | ✅ |
| Multi-LLM Analysis #3 | deepseek-r1:free | OpenRouter | Limited | ✅ |
| SEO Recommendations | gemini-2.5-flash | Google | 60 RPM | ✅ |

### Cost Analysis

**Free Tier Usage (Per Premium User Scan):**
- Prompt Generation: 1 request (HuggingFace) = FREE
- Multi-LLM Analysis: 10 prompts × 3 LLMs = 30 requests
  - Gemini: 10 requests (within 60 RPM limit) = FREE
  - HuggingFace: 10 requests (within 1K/month) = FREE
  - OpenRouter: 10 requests (free tier) = FREE
- SEO Recommendations: 1 request (Gemini) = FREE
- **Total per scan:** ~32 API calls = **FREE** (within limits)

**Monthly Limits:**
- HuggingFace: 1,000 requests/month = ~33 premium scans/month (prompt gen)
- Gemini: 60 RPM = Unlimited for normal usage
- OpenRouter: Limited free tier = Monitor usage

---

## 💎 Premium Features

### Premium User Benefits

1. **100 Scans Per Month** (auto-resets monthly)
2. **10 Custom Prompts** - AI-generated based on your business
3. **Multi-LLM Analysis** - 3 LLMs analyze each prompt (30 total analyses)
4. **SEO Recommendations** - 10-15 actionable recommendations
5. **Competitor Comparison** - Compare up to 5 URLs
6. **PDF Export** - Download detailed reports
7. **Full Recommendations** - See all AI recommendations (not just CTAs)
8. **Google Integrations** - Connect GSC/GA (Professional tier)

### How Premium Features Work

#### 1. Custom Prompt Generation
When a premium user runs an analysis:
- System uses brand summary & industry (if provided)
- Generates 10 business-specific prompts using HuggingFace Gemma 2
- Each prompt is tailored to test different aspects of AI visibility

#### 2. Multi-LLM Analysis
For each of the 10 prompts:
- **Gemini** analyzes (primary)
- **HuggingFace Qwen** analyzes (cross-check)
- **OpenRouter DeepSeek** analyzes (reasoning)
- Results are compared and aggregated

#### 3. SEO Recommendations
- Analyzes SEO data + LLM visibility results
- Generates prioritized recommendations
- Includes action items for each recommendation

### Free vs Premium

**Free Tier:**
- ✅ 1 anonymous scan OR 3 logged-in scans (total)
- ✅ Basic SEO analysis (all metrics)
- ✅ LLM visibility score (3 standard prompts)
- ✅ Prompt breakdown with responses
- ✅ Citation detection
- ✅ CSV export
- ❌ Custom prompts (shows premium CTA)
- ❌ Multi-LLM analysis (shows premium CTA)
- ❌ SEO recommendations (shows premium CTA)
- ❌ PDF export (shows premium CTA)
- ❌ Competitor comparison (shows premium CTA)

**Premium Tier:**
- ✅ **100 scans per month** (auto-resets)
- ✅ All free features
- ✅ **10 custom AI-generated prompts**
- ✅ **Multi-LLM analysis** (3 LLMs per prompt)
- ✅ **Full SEO recommendations** (10-15 prioritized)
- ✅ **Competitor comparison** (up to 5 URLs)
- ✅ **PDF export**
- ✅ **Historical tracking** (all scans)
- ✅ **Priority support**

**Pricing Tiers:**
- **Free:** 1 anonymous + 3 logged-in scans
- **Starter ($19/mo):** 50 scans/month + basic premium features
- **Professional ($49/mo):** 200 scans/month + all premium features + Google integrations

---

## 👤 Setting Premium Users

### Using Script (Recommended)

```bash
cd backend
node scripts/setPremiumUser.js user@example.com
```

Or use default test user:
```bash
cd backend
node scripts/setPremiumUser.js
# Sets yashrajmeen@gmail.com as premium
```

### Using MongoDB Shell

```javascript
use your_database_name
db.users.updateOne(
  { email: "user@example.com" },
  { 
    $set: { 
      isPremium: true,
      tier: "professional", // or "starter"
      premiumExpiresAt: null // No expiration for testing
    }
  }
)
```

### Using MongoDB Compass

1. Open MongoDB Compass
2. Connect to your database
3. Navigate to the `users` collection
4. Find the user with email `user@example.com`
5. Edit the document and set:
   - `isPremium`: `true`
   - `tier`: `"professional"` or `"starter"`
   - `premiumExpiresAt`: `null` (or a future date)

### Verify Premium Status

After setting, verify by:
1. **Login** with the premium email
2. **Check** if you see:
   - "Compare" button in navbar
   - PDF export option in results
   - Full recommendations (not premium CTA)
   - Monthly scan count (X/100 or X/200)

### Testing Premium Features

Once set as premium, you can test:
1. **Competitor Comparison** - Click "Compare" in navbar
2. **PDF Export** - Run an analysis, click "Export PDF"
3. **Full Recommendations** - View recommendations (should show full list)
4. **Monthly Limits** - Check scan count resets monthly

---

## 🔒 Security & Production

### Security Measures Implemented

✅ **OTP Security**
- OTP never returned in API response (production)
- OTP only logged in development mode
- OTP removed from frontend console

✅ **Rate Limiting**
- Auth endpoints: 5 requests per 15 minutes
- Analysis endpoints: 20/hour (free), 100/hour (premium)

✅ **Input Validation**
- Request body sanitization (XSS prevention)
- URL security validation (SSRF prevention)
- Request size limits (10MB max)

✅ **Security Headers**
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy (production)

✅ **Logging Security**
- No sensitive data in production logs
- No OTP, tokens, or passwords logged
- Minimal error messages in production

### Production Checklist

Before deploying:

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secret (32+ characters)
- [ ] Configure SMTP for email
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure CORS for your domain only
- [ ] Set up MongoDB authentication
- [ ] Enable SSL/TLS for database
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts
- [ ] Regular database backups
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Never commit `.env` files
- [ ] Rotate API keys regularly
- [ ] Use secure cookies in production
- [ ] Set appropriate cookie expiration
- [ ] Monitor for suspicious activity

---

## 🛠️ Troubleshooting

### API Key Issues

**"API key not valid"**
- Check `.env` file has correct key
- Ensure no extra spaces
- Verify key is active in provider dashboard

**"Quota exceeded"**
- Gemini: Wait 1 minute (60 RPM limit)
- HuggingFace: Check monthly limit (1,000/month)
- OpenRouter: Check free tier limits

### Model Issues

**"Model not found"**
- Verify model name is correct
- Check if model is available in provider
- Some models may require wait time on first use

**"JSON parsing failed"**
- Models have fallback to text parsing
- Check logs for actual response
- May need to adjust prompt format

### Database Issues

**"Connection failed"**
- Check MongoDB is running
- Verify `MONGODB_URI` in `.env`
- Check network/firewall settings

### Email/OTP Issues

**"OTP not received"**
- Check SMTP configuration
- In development, check console logs
- Verify email address is correct
- Check spam folder

### Google OAuth Issues

**"OAuth flow not working"**
- Verify redirect URI matches exactly in Google Console
- Check OAuth consent screen is configured
- Ensure scopes are correct
- Check token encryption key is set

---

## 📊 Usage Limits

### API Rate Limits

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Google Gemini | 60 RPM | Higher (based on billing) |
| HuggingFace | 1,000/month | Higher (paid plans) |
| OpenRouter | Limited | Based on credits |
| Google Search Console | 100 requests/day | Higher (paid plans) |

### User Limits

| User Type | Scans | Reset Period |
|-----------|-------|--------------|
| Anonymous | 1 | Never (per device/IP) |
| Free | 3 | Never (total) |
| Starter | 50 | Monthly (auto-resets) |
| Professional | 200 | Monthly (auto-resets) |

---

## 📝 Environment Variables Summary

```env
# Required
GEMINI_API_KEY=your_gemini_key
MONGODB_URI=mongodb://localhost:27017/optisenseai
JWT_SECRET=your_jwt_secret

# Optional (for Premium Features)
HUGGINGFACE_API_KEY=your_huggingface_token
OPENROUTER_API_KEY=your_openrouter_key

# Optional (for Email OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Optional (for Google Integrations)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/integrations/google/callback
ENCRYPTION_KEY=your_random_32_character_string
FRONTEND_URL=http://localhost:3000

# Optional (Production)
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
APP_URL=https://yourdomain.com
```

---

## 🔗 Useful Links

- **Google Gemini:** https://makersuite.google.com/
- **HuggingFace:** https://huggingface.co/
- **OpenRouter:** https://openrouter.ai/
- **MongoDB Atlas:** https://www.mongodb.com/cloud/atlas
- **Google Cloud Console:** https://console.cloud.google.com/

---

**Need help? Check the main README.md or open an issue!** 🚀

