# See-Market Implementation Guide

## Overview

This document outlines the enhancements made to the See-Market application, including GLM 5.1 AI integration via AgentRouter, backend caching, AI-reviewed marketing analysis, customizable AI settings, white theme support, and full Vercel compatibility.

## New Features

### 1. GLM 5.1 AI Integration via AgentRouter

**Backend Integration:**
- Added `callGLM5()` function that connects to AgentRouter API (`https://agentrouter.org/v1`)
- Model: `gpt-5` (GLM 5.1)
- Supports configurable AI tone and case sensitivity
- Requires `AGENTROUTER_API_KEY` environment variable

**Usage:**
```javascript
const aiResponse = await callGLM5(
  systemPrompt,
  userMessage,
  {
    tone: 'professional', // 'professional' | 'casual' | 'leisure'
    caseSensitive: true,
    temperature: 0.7
  }
);
```

### 2. Backend Caching Layer

**Implementation:**
- In-memory cache with TTL (Time-To-Live)
- Default TTL: 5 minutes (300,000 ms)
- Cache key format: `analysis:{symbol}:{assetType}`
- Reduces redundant API calls to Yahoo Finance

**Features:**
- Automatic cache expiration
- Cache hit logging
- Configurable TTL per cache entry

### 3. AI Review Logic

**New Endpoint:** `POST /api/v1/chat/analyze`

**Features:**
- AI reviews all market data and calculated indicators
- Generates insights based on:
  - Current price and change percentage
  - Sentiment analysis (RSI-based)
  - Risk score and market regime
  - Technical indicators (RSI, MACD, support/resistance)
- Respects user's AI tone and case sensitivity settings
- All reviews stored in backend (`backend/data/ai_reviews.json`)

**Response includes:**
```json
{
  "ai_review": "Generated AI analysis text",
  "ai_review_data": {
    "symbol": "AAPL",
    "price": 150.25,
    "sentiment_label": "neutral",
    "risk_score": 45,
    ...
  }
}
```

### 4. AI Settings Management

**New Endpoints:**

- `GET /api/v1/ai-settings?user_id={userId}` - Retrieve user's AI settings
- `POST /api/v1/ai-settings` - Save/update AI settings

**Settings Available:**
- **Tone**: `professional` | `casual` | `leisure`
  - Professional: Formal, precise terminology
  - Casual: Friendly, accessible language
  - Leisure: Relaxed, conversational insights
- **Case Sensitivity**: `true` | `false`
  - Affects AI's precision level in technical references
- **Theme**: `dark` | `white`
  - Controls UI appearance

**Storage:**
- User settings stored in `backend/data/ai_settings.json`
- Per-user customization
- Persisted across sessions

### 5. White Theme Support

**Frontend Changes:**
- Updated `app/globals.css` with theme-aware styles
- Added `data-theme` attribute support
- Light mode uses white/light gray backgrounds with dark text
- Dark mode (default) uses dark backgrounds with light text

**Theme Toggle:**
- Available in Settings page
- Stored in backend AI settings
- Applied globally via `ThemeContext`

### 6. Backend-Only Data Storage

**All data now stored in backend:**
- Watchlist: `backend/data/watchlist.json`
- Chat history: `backend/data/chats.json`
- AI settings: `backend/data/ai_settings.json`
- AI reviews: `backend/data/ai_reviews.json`

**No client-side persistence** for sensitive data:
- Frontend uses backend APIs for all data operations
- Settings sync across devices
- Secure data isolation per user

### 7. Vercel Compatibility

**Frontend (Next.js):**
- `frontend/vercel.json` - Build configuration
- Automatic deployment from `frontend/` directory
- Environment variable: `NEXT_PUBLIC_API_URL`

**Backend (Express.js):**
- `backend/vercel.json` - Serverless configuration
- Configured for Node.js 20.x runtime
- Memory: 3008 MB
- Max duration: 300 seconds
- Environment variables:
  - `AGENTROUTER_API_KEY` - AgentRouter API key
  - `CORS_ORIGIN` - Allowed CORS origin

**Root Configuration:**
- `vercel.json` - Monorepo setup
- Deploys both frontend and backend as separate projects

## Environment Variables

### Backend (.env)
```
PORT=8000
CORS_ORIGIN=https://see-market.vercel.app
AGENTROUTER_API_KEY=your_api_key_here
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
```

## API Endpoints

### Market Data
- `GET /api/v1/markets/:symbol?asset_type=stock|crypto` - Get market snapshot
- `GET /api/v1/markets/movers/list?asset_type=stock|crypto` - Get top movers
- `GET /api/v1/markets/trending/list?asset_type=stock|crypto` - Get trending assets
- `GET /api/v1/dashboard/:symbol?asset_type=stock|crypto` - Get dashboard data

### Chat & Analysis
- `POST /api/v1/chat/analyze` - Run AI analysis with review
- `GET /api/v1/chat/saved?user_id=1` - Get saved chats

### AI Settings
- `GET /api/v1/ai-settings?user_id=1` - Get user's AI settings
- `POST /api/v1/ai-settings` - Update AI settings

### AI Reviews
- `GET /api/v1/ai-reviews?user_id=1` - Get all AI reviews for user

### Watchlist
- `GET /api/v1/watchlist?user_id=1` - Get watchlist
- `POST /api/v1/watchlist` - Add to watchlist
- `DELETE /api/v1/watchlist/:symbol?user_id=1` - Remove from watchlist

### Health
- `GET /health` - Health check endpoint

## Frontend Components

### New/Updated Components

**Providers (`components/providers.tsx`)**
- Added `ThemeContext` for global theme management
- Added `useTheme()` hook for accessing theme and AI settings
- Loads user settings on mount
- Syncs theme changes to document

**Settings Page (`app/settings/page.tsx`)**
- Theme toggle (Dark/White)
- AI tone selector (Professional/Casual/Leisure)
- Case sensitivity toggle
- Settings persistence via backend API

**Chat Page (`app/chat/page.tsx`)**
- Displays AI review in dedicated section
- Shows data snapshot used for analysis
- Displays AI tone in review header
- Saved chats include AI reviews

## Type Definitions

### New Types (lib/api.ts)

```typescript
type AiTone = 'professional' | 'casual' | 'leisure';
type Theme = 'dark' | 'white';

interface AiSettings {
  user_id: number;
  tone: AiTone;
  caseSensitive: boolean;
  theme: Theme;
  updated_at?: string;
}

interface AiReview {
  id: number;
  user_id: number;
  symbol: string;
  review: string;
  data_snapshot: Record<string, unknown>;
  created_at: string;
}
```

## Deployment Instructions

### Deploy to Vercel

**Option 1: Monorepo (Recommended)**
```bash
# Push to GitHub
git add .
git commit -m "Add GLM 5.1, caching, AI settings, and Vercel compatibility"
git push origin main

# Connect repo to Vercel
# Vercel will auto-detect monorepo structure and deploy both projects
```

**Option 2: Separate Deployments**

Frontend:
```bash
cd frontend
vercel deploy
```

Backend:
```bash
cd backend
vercel deploy
```

### Set Environment Variables in Vercel

**Frontend Project:**
- `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://see-market-backend.vercel.app`)

**Backend Project:**
- `AGENTROUTER_API_KEY`: Your AgentRouter API key from https://agentrouter.org/console/token
- `CORS_ORIGIN`: Your frontend URL (e.g., `https://see-market.vercel.app`)

## Configuration

### AgentRouter Setup

1. Create account at https://agentrouter.org
2. Get API key from https://agentrouter.org/console/token
3. Add to backend environment variables
4. API will use model `gpt-5` (GLM 5.1)

### CORS Configuration

Update `CORS_ORIGIN` environment variable to match your frontend URL for production:
```
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

## Performance Considerations

### Caching
- Market data cached for 5 minutes
- Reduces API calls to Yahoo Finance
- Improves response times for repeated queries

### AI Review Generation
- Runs asynchronously after market analysis
- Non-blocking (errors don't fail the analysis)
- Stored for future reference

### Backend Storage
- File-based JSON storage (suitable for Vercel's ephemeral filesystem)
- Consider migrating to database for production scale
- Current setup supports ~500 AI reviews per user

## Security Notes

1. **API Keys**: Store `AGENTROUTER_API_KEY` in Vercel secrets, never commit
2. **CORS**: Restrict to your frontend domain only
3. **User Isolation**: Settings and data isolated per `user_id`
4. **Data Validation**: All inputs sanitized before processing

## Troubleshooting

### AI Review Not Generating
- Check `AGENTROUTER_API_KEY` is set correctly
- Verify AgentRouter account has available credits
- Check backend logs for API errors

### Theme Not Persisting
- Ensure backend is running and accessible
- Check browser console for API errors
- Verify `user_id` is consistent

### Cache Issues
- Cache automatically expires after 5 minutes
- Clear cache by restarting backend
- Monitor cache hits in logs

## Future Enhancements

1. **Database Migration**: Replace JSON files with PostgreSQL/MongoDB
2. **User Authentication**: Implement proper auth instead of user_id
3. **Advanced Caching**: Redis for distributed caching
4. **Rate Limiting**: Prevent abuse of AI review generation
5. **Analytics**: Track AI review usage and effectiveness
6. **Multi-language**: Extend AI tone support to multiple languages

## Support

For issues or questions:
1. Check logs in Vercel dashboard
2. Verify environment variables are set
3. Test backend health: `GET /health`
4. Review AgentRouter API documentation
