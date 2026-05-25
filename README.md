# See-market

Production-ready AI-powered financial market analysis platform.

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, Zustand, React Query, Lightweight Charts, Framer Motion
- **Backend**: FastAPI, asyncio, WebSockets, SQLAlchemy, PostgreSQL, Redis, Pandas/Numpy, scikit-learn, ta-lib
- **AI**: Gemma (`google/gemma-4-26b-a4b-it`) through OpenRouter-compatible API

## Repository layout

- `frontend/` – web dashboard and chat client
- `backend/` – API, AI orchestration, market intelligence services
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

## Endpoints

- `GET /health`
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `GET /api/v1/markets/{symbol}`
- `POST /api/v1/markets/analyze`
- `POST /api/v1/chat/analyze`
- `WS /api/v1/chat/stream/{channel}`

## Deployment

- Frontend is Vercel-compatible out of the box (`next build` / `next start`)
- Backend is Render-compatible via included `Dockerfile` and `render.yaml`
