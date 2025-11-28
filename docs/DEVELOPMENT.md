# OptiSenseAI - Development Guide

## 📋 Table of Contents
1. [Implementation Status](#implementation-status)
2. [Implementation Plan](#implementation-plan)
3. [Key Files Modified](#key-files-modified)
4. [Testing Checklist](#testing-checklist)
5. [Next Steps](#next-steps)

---

## Implementation Status

### ✅ Completed

#### Phase 1: Pricing Tier Restructure
- ✅ Updated User model to support `free`, `starter`, `professional` tiers
- ✅ Updated monthlyLimit middleware with tier-based limits
- ✅ Updated analyze route to use new tier system
- ✅ Updated PricingComparison component to show 3 tiers
- ✅ Created migration script (`backend/scripts/migrateTiers.js`)
- ✅ Updated setPremiumUser script to support new tiers

#### Phase 5: Feature Clarity & Explainability
- ✅ Created FeatureExplanation component
- ✅ Added LLM Visibility Score explanation to ResultsDisplay
- ✅ Added CSS styling for feature explanations
- ✅ Enhanced score display with calculation details

#### Phase 2: Google Search Console & Analytics Integration (Backend)
- ✅ Created Integration model with encrypted token storage
- ✅ Created integrationService.js with OAuth flow and data fetching
- ✅ Created integration routes (`/api/integrations/*`)
- ✅ Added integration routes to server.js
- ✅ Updated analyze route to fetch integration data for Professional tier
- ✅ Updated Scan model to store integration data

---

## ⚠️ Requires Action

### 1. Install Required NPM Package
**Location:** `backend/package.json`

```bash
cd backend
npm install googleapis
```

**Why:** Required for Google OAuth and API access

**Status:** ✅ Already installed (check package.json)

---

### 2. Environment Variables
**File:** `backend/.env`

Add these variables:

```env
# Google OAuth (Required for Phase 2)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/integrations/google/callback

# Encryption key for OAuth tokens (generate random 32-char string)
ENCRYPTION_KEY=your_random_32_character_string_here

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000
```

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

### 3. Google Cloud Console Setup
**Action Required:** Set up OAuth credentials in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable APIs:
   - Google Search Console API
   - Google Analytics Reporting API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:5000/api/integrations/google/callback`
5. Copy Client ID and Client Secret to `.env`

**Time estimate:** 30-60 minutes

---

## 🚧 Partially Complete

### Phase 2: Frontend Integration UI
**Status:** Backend complete, frontend UI needed

**What's missing:**
- `frontend/src/components/Integrations.jsx` - UI component for connecting/disconnecting Google accounts
- Update `frontend/src/components/ResultsDisplay.jsx` to display integration data
- Add integration section to account/profile page

**Files to create:**
- `frontend/src/components/Integrations.jsx`

**Files to update:**
- `frontend/src/components/ResultsDisplay.jsx` - Add Search Console and Analytics data sections
- `frontend/src/components/AccountSection.jsx` or create new account page with integrations

---

## Implementation Plan

### Overview

Transform OptiSenseAI into a focused, valuable SEO tool by prioritizing high-impact features that can be executed by a solo developer. Focus on pricing restructure, Google integrations, and feature clarity - skip complex features like backlink analysis and enterprise tier for now.

### Phase 1: Pricing Tier Restructure (Days 1-7) ✅

**Goal:** Replace single "premium" tier with 3 clear tiers

#### 1.1 Update User Model ✅
**File:** `backend/src/models/User.js`
- Changed `tier` enum to: `['free', 'starter', 'professional']`
- Updated `isPremium` logic: `tier !== 'free'`
- Added helper: `getTierLimit(user)` returns scan limit

#### 1.2 Update Monthly Limit Middleware ✅
**File:** `backend/src/middleware/monthlyLimit.js`
- Replaced hardcoded `100` with tier-based limits:
  - Free: 3 scans (lifetime, no reset)
  - Starter: 50 scans/month
  - Professional: 200 scans/month

#### 1.3 Update Pricing UI ✅
**File:** `frontend/src/components/PricingComparison.jsx`
- Shows 3 tiers with clear feature comparison
- Starter: $19/mo, 50 scans, basic premium features
- Professional: $49/mo, 200 scans, integrations, keyword tracking

#### 1.4 Migration Script ✅
**File:** `backend/scripts/migrateTiers.js`
- Migrates existing `isPremium: true` users to `tier: 'professional'`
- Run once before deployment

---

### Phase 2: Google Search Console & Analytics Integration (Days 8-21)

**Goal:** Allow Professional tier users to connect GSC/GA and see data in scan results

#### 2.1 Create Integration Service ✅
**File:** `backend/src/services/integrationService.js`
- OAuth2 flow implementation
- Token encryption/decryption
- GSC data fetching
- GA data fetching
- Token refresh logic

#### 2.2 Create Integration Model ✅
**File:** `backend/src/models/Integration.js`
- Stores: provider, encrypted tokens, property IDs, last sync

#### 2.3 Create Integration Routes ✅
**File:** `backend/src/routes/integrations.js`
- `GET /api/integrations/google/connect` - Start OAuth
- `GET /api/integrations/google/callback` - OAuth callback
- `GET /api/integrations` - List user's integrations
- `POST /api/integrations/:id/disconnect` - Disconnect
- `GET /api/integrations/search-console/data` - Fetch GSC data
- `GET /api/integrations/analytics/data` - Fetch GA data

#### 2.4 Update Analysis Route ✅
**File:** `backend/src/routes/analyze.js`
- If Professional tier + GSC connected: fetch top queries
- If Professional tier + GA connected: fetch traffic metrics
- Add to scan results

#### 2.5 Create Integration UI ⚠️
**File:** `frontend/src/components/Integrations.jsx` (TODO)
- Connect Google button
- Integration status cards
- Connected properties list
- Sync status indicator

#### 2.6 Update Results Display ⚠️
**File:** `frontend/src/components/ResultsDisplay.jsx` (TODO)
- Add "Search Console Data" section (if connected)
- Show: top queries, impressions, clicks, CTR
- Add "Analytics Data" section (if connected)
- Show: sessions, users, bounce rate

---

### Phase 3: Keyword Research (Optional, Days 22-28)

**Goal:** Basic keyword suggestions and lightweight rank tracking

**⚠️ Recommendation: Skip this phase initially, add after Phase 2 is stable**

If implemented:
- Use Google Autocomplete for suggestions (free)
- Basic rank tracking (10-20 keywords max)
- Simple UI for tracking keywords
- Historical rank chart

---

### Phase 5: Feature Clarity & Explainability (Days 2-4) ✅

**Goal:** Users understand what they're paying for

#### 5.1 LLM Visibility Score Explanation ✅
**File:** `frontend/src/components/ResultsDisplay.jsx`
- Added expandable "What is this?" section
- Explains: "Measures how well AI models (ChatGPT, Claude, Gemini) recommend your website"
- Shows calculation: "3 prompts × 3 points = 9 max"
- Explains scoring: Mentioned = 3pts, Citation = 2pts, Mention = 1pt
- Added examples of good vs bad scores

#### 5.2 Feature Explanation Component ✅
**File:** `frontend/src/components/FeatureExplanation.jsx`
- Reusable tooltip/expandable component
- Used for: LLM visibility, integrations, keyword tracking

#### 5.3 Update Score Display ✅
**File:** `frontend/src/components/ResultsDisplay.jsx`
- Shows clearer breakdown: "Score: X/9 (Y%)"
- Explains each prompt's purpose
- Added visual indicators for score ranges

---

## Key Files Modified

### Backend
- `backend/src/models/User.js` - Tier system
- `backend/src/middleware/monthlyLimit.js` - Tier limits
- `backend/src/routes/analyze.js` - Tier system + integration data
- `backend/src/models/Scan.js` - Integration data storage
- `backend/src/server.js` - Integration routes
- `backend/scripts/migrateTiers.js` - Migration script (new)
- `backend/scripts/setPremiumUser.js` - Updated for tiers
- `backend/src/models/Integration.js` - Integration model (new)
- `backend/src/services/integrationService.js` - Integration service (new)
- `backend/src/routes/integrations.js` - Integration routes (new)

### Frontend
- `frontend/src/components/PricingComparison.jsx` - 3 tiers
- `frontend/src/components/ResultsDisplay.jsx` - LLM score explanation
- `frontend/src/components/FeatureExplanation.jsx` - Explanation component (new)
- `frontend/src/styles/globals.css` - Feature explanation styles

---

## Testing Checklist

### Phase 1 Testing ✅
- [x] Free tier: 3 scans max (lifetime)
- [x] Starter tier: 50 scans/month (resets monthly)
- [x] Professional tier: 200 scans/month (resets monthly)
- [x] Pricing UI shows 3 tiers correctly
- [x] Migration script works for existing premium users

### Phase 2 Testing (After Google setup)
- [ ] OAuth flow works (connect Google account)
- [ ] GSC data displays in scan results
- [ ] GA data displays in scan results
- [ ] Token refresh works (test after 1 hour)
- [ ] Disconnect integration works
- [ ] Error handling (expired tokens, API errors)

### Phase 5 Testing ✅
- [x] LLM score explanation is clear
- [x] Feature explanation component works
- [x] Tooltips/help text display correctly

---

## Next Steps

### Immediate (Before Testing)
1. **Install googleapis package:**
   ```bash
   cd backend
   npm install googleapis
   ```
   **Status:** ✅ Already installed

2. **Set up Google Cloud Console:**
   - Follow instructions in this guide
   - Add credentials to `.env`

3. **Run migration script (if you have existing premium users):**
   ```bash
   cd backend
   node scripts/migrateTiers.js
   ```

### Short Term (Complete Phase 2)
1. Create `frontend/src/components/Integrations.jsx`
2. Update ResultsDisplay to show GSC/GA data
3. Add integration management to account page
4. Test OAuth flow end-to-end

### Medium Term (Optional - Phase 3)
- Keyword research and rank tracking (can be skipped initially per plan)

---

## Notes & Warnings

1. **OAuth Setup is Complex:** Allow extra time for Google OAuth setup and testing
2. **Token Management:** Implemented robust token refresh - expired tokens will auto-refresh
3. **Rate Limits:** GSC API = 100 requests/day (free tier) - consider implementing caching
4. **User Education:** Users need to understand they must have GSC/GA set up first
5. **Backward Compatibility:** Existing premium users will be migrated to Professional tier
6. **Start Small:** Focus on Phases 1, 2, and 5 first - skip Phase 3 until you have revenue

---

## 🚫 What We're NOT Building (Yet)

**Explicitly skipped:**
- ❌ Backlink analysis (too complex, requires paid APIs)
- ❌ Enterprise tier features (team seats, API access)
- ❌ Advanced rank tracking with proxies
- ❌ Full keyword research database
- ❌ Competitor analysis beyond basic comparison
- ❌ Site crawling (beyond single page analysis)
- ❌ Payment integration (Stripe/Paddle setup is separate)

**Why:**
- These features are expensive to build/maintain
- Require paid APIs or complex infrastructure
- Better to validate core value first
- Can add later after revenue

---

## ✅ Success Criteria

**Phase 1 Complete When:** ✅
- [x] 3 pricing tiers visible in UI
- [x] Tier limits enforced in backend
- [x] Existing users can be migrated to new tiers
- [x] Documentation updated

**Phase 2 Complete When:**
- [ ] Users can connect Google accounts
- [ ] GSC data displays in scan results
- [ ] GA data displays in scan results
- [ ] Token refresh works automatically
- [ ] Users can disconnect accounts

**Phase 5 Complete When:** ✅
- [x] LLM visibility score has clear explanation
- [x] Tooltips/help text added to key features
- [x] Users understand what they're paying for

**Overall Success:**
- Professional tier ($49/mo) feels worth the price
- Users understand the value proposition
- Integrations work reliably
- No major bugs in production

---

## 📅 Realistic Timeline

**Phase 1 (Pricing Tiers):** ✅ 5-7 days - Complete
**Phase 5 (Feature Clarity):** ✅ 2-3 days - Complete
**Phase 2 (Google Integrations):** ⚠️ 10-14 days - Backend Complete, Frontend Pending
**Phase 3 (Keyword Research):** ⏸️ 5-7 days (if implemented) - Skipped for now

**Total realistic timeline:** 20-30 days for core features (Phases 1, 2, 5)

---

**Last Updated:** Current Date
**Status:** Phase 1 & 5 Complete, Phase 2 Backend Complete (Frontend Pending)

