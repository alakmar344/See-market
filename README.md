# See-market

Simplified market analysis platform with a Next.js frontend and a lightweight Node.js backend.

## Stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS
- **Backend**: Node.js + Express (JavaScript)
- **Market data**: yfinance-compatible Yahoo Finance endpoints

## Repository layout

- `frontend/` – dashboard, market pages, AI chat, watchlist
- `backend/` – Express API with simple file-based persistence
- `docs/architecture.md` – architecture overview
- `Dockerfile` + `render.yaml` – deployment settings

## Environment variables

### Backend (`backend/.env`)

- `PORT=8000`
- `CORS_ORIGIN=https://see-market.vercel.app`

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Local setup

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
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
