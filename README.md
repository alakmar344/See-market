# See-market

Production-grade AI-powered financial market analysis platform.

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, Zustand, React Query, Lightweight Charts, Framer Motion
- **Backend**: FastAPI, asyncio, WebSockets, SQLAlchemy + SQLite, Pandas/Numpy, scikit-learn, ta-lib
- **AI**: Google AI Studio Gemma (`gemma-4-31b-it`) with backend-validated market context

## Repository layout

- `frontend/` – dashboard, market pages, AI chat, watchlist, onboarding
- `backend/` – API, providers, indicator/risk/sentiment engines, websocket streaming, cache
- `docs/architecture.md` – architecture overview
- `Dockerfile` + `render.yaml` – Render deployment

## Environment variables (exact)

### Backend (`backend/.env`)

Required:

- `GOOGLE_API_KEY`

Optional (with defaults):

- `APP_ENV=production`
- `DATABASE_URL=sqlite+aiosqlite:///./see_market.db`
- `CACHE_DIR=./cache`
- `GEMMA_MODEL=gemma-4-31b-it`
- `BINANCE_API_KEY=` (optional provider key)
- `BINANCE_SECRET=` (optional provider secret)
- `FINNHUB_API_KEY=` (optional provider key)
- `ALPHAVANTAGE_API_KEY=` (optional provider key)
- `CORS_ORIGINS=["http://localhost:3000"]`

### Frontend (`frontend/.env.local`)

Optional (with defaults):

- `NEXT_PUBLIC_API_URL=http://localhost:8000`
- `NEXT_PUBLIC_WS_URL=ws://localhost:8000`

## Local setup

### Backend

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## API overview

- `GET /health`
- `GET /api/v1/markets/{symbol}`
- `GET /api/v1/markets/trending/list`
- `GET /api/v1/markets/movers/list`
- `POST /api/v1/chat/analyze`
- `GET /api/v1/chat/saved`
- `GET|POST|DELETE /api/v1/watchlist`
- `WS /api/v1/chat/stream/{channel}`

## Security defaults

- Strict CORS origin allowlist
- Request sanitization + Pydantic validation
- CSRF middleware for state-changing requests
- Rate limiting middleware
- Security headers middleware

## Deployment

- Frontend is Vercel-compatible (`next build` / `next start`)
- Backend is Render-compatible with included `Dockerfile` and `render.yaml`
