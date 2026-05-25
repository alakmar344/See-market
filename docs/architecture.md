# See-market Architecture

## Overview

See-market is split into:

- `frontend/`: Next.js 15 App Router UI (dashboard, markets, chat, watchlist, settings)
- `backend/`: FastAPI async service layer (auth, market analysis, AI orchestration, websocket streaming)

## Backend flow

1. API receives question (`/api/v1/chat/analyze`)
2. `MarketAnalysisService` fetches market data from provider abstraction:
   - Binance for crypto
   - Yahoo Finance for stocks
   - AlphaVantage fallback
3. Backend computes indicators, sentiment, and risk engines
4. Structured compact JSON context is sent to Gemma via OpenRouter
5. JSON response is returned to frontend with confidence and risk-aware narrative

## Security controls

- Request sanitization for user inputs
- JWT auth with bcrypt hashing
- account lockout after repeated failed login attempts
- CORS middleware
- security headers middleware (helmet-like)
- request rate limiting middleware

## Realtime

WebSocket route `/api/v1/chat/stream/{channel}` supports streaming analysis updates and watchlist widgets.
