# See-market Architecture

## Overview

See-market is split into:

- `frontend/`: Next.js 15 App Router UI optimized for desktop and mobile
- `backend/`: Express service that returns market snapshots, AI summaries, saved chats, and watchlist data

## Core backend flow

1. User requests market data.
2. Backend fetches quotes/history from Yahoo Finance.
3. Backend computes lightweight indicators (RSI, MACD, trend, support/resistance) and risk score.
4. Backend returns compact JSON used directly by the frontend.
5. Chat analysis is stored in a local JSON file for quick retrieval.

## Storage strategy

- File-based JSON persistence for chats and watchlists in `backend/data/`
- No database dependency required for local development

## Security

- Strict CORS allowlist (single frontend origin): `https://see-market.vercel.app`
- Input sanitization for symbols and form fields
- Health endpoint for uptime checks
