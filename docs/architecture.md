# See-market Architecture

## Overview

See-market is split into:

- `frontend/`: Next.js 15 App Router client for dashboard, chat, watchlist, settings
- `backend/`: FastAPI async service for market intelligence, AI reasoning, and realtime streams

## Core backend pipeline

1. User asks a market question.
2. Provider abstraction fetches validated data:
   - Binance for crypto
   - Yahoo Finance for stocks
   - Finnhub for news
   - AlphaVantage fallback
3. Backend computes indicators, risk metrics, and sentiment.
4. Structured compact JSON context is generated and cached.
5. Context is sent to Google AI Studio Gemma (`gemma-4-31b-it`) for reasoning.
6. Backend returns structured analysis to frontend.

## Storage strategy

- SQLite via SQLAlchemy for users, chats, watchlists, and local persistence
- JSON cache files for temporary market/cache payloads
- In-memory async cache for low-latency live sessions

## Realtime system

WebSocket endpoint `/api/v1/chat/stream/{channel}` broadcasts:

- context frames
- streaming delta frames for AI response text
- completion frame for final assembled output

## Security and reliability

- CORS allowlist with credentials
- CSRF token checks for state-changing routes
- Input sanitization + strict validation
- Rate limiting and monitoring middleware
- Structured logging + health endpoint + graceful lifespan startup/shutdown
