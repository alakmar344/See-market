# See-market

Production-grade AI-powered financial market analysis platform.

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, Zustand, React Query, Lightweight Charts, Framer Motion
- **Backend**: FastAPI, asyncio, WebSockets, SQLAlchemy + SQLite, Pandas/Numpy, scikit-learn, ta-lib
- **AI**: Google AI Studio Gemma (`gemma-4-31b-it`) with backend-validated market context

## Repository layout

- `frontend/` – dashboard, market pages, AI chat, watchlist, onboarding
- `backend/` – API, providers, indicator/risk/sentiment engines, auth, websocket streaming, cache
- `docs/architecture.md` – architecture overview
- `Dockerfile` + `render.yaml` – Render deployment

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
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/forgot-password`
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
- JWT auth + secure cookies + account lockout

## Deployment

- Frontend is Vercel-compatible (`next build` / `next start`)
- Backend is Render-compatible with included `Dockerfile` and `render.yaml`
