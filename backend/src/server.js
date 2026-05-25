import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
const watchlistPath = path.join(dataDir, 'watchlist.json');
const chatsPath = path.join(dataDir, 'chats.json');

const app = express();
const port = Number(process.env.PORT || 8000);
const corsOrigin = process.env.CORS_ORIGIN || 'https://see-market.vercel.app';
let requestCounter = 0;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const requestId = `req-${Date.now()}-${++requestCounter}`;
  const startedAt = Date.now();
  req.requestId = requestId;
  console.log('[server][request:start]', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body
  });

  res.on('finish', () => {
    console.log('[server][request:finish]', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });
  next();
});

function ensureDataFile(filePath) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]', 'utf8');
}

function readJson(filePath) {
  ensureDataFile(filePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function writeJson(filePath, data) {
  ensureDataFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function sanitizeText(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9 ._\-]/g, '')
    .trim();
}

function normalizeSymbol(value) {
  return sanitizeText(value).toUpperCase();
}

function yahooSymbol(symbol, assetType) {
  if (assetType === 'crypto') {
    const base = symbol.endsWith('USDT') ? symbol.slice(0, -4) : symbol;
    return `${base}-USD`;
  }
  return symbol;
}

async function fetchYahooQuote(symbol) {
  console.log('[provider][quote:start]', { symbol });
  const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`);
  const payload = await response.json();
  console.log('[provider][quote:response]', { symbol, ok: response.ok, status: response.status });
  const quote = payload?.quoteResponse?.result?.[0];
  if (!quote) throw new Error('Quote unavailable');
  console.log('[provider][quote:success]', { symbol, marketPrice: Number(quote.regularMarketPrice ?? 0) });
  return quote;
}

async function fetchYahooHistory(symbol) {
  console.log('[provider][history:start]', { symbol });
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1h&range=1mo`);
  const payload = await response.json();
  console.log('[provider][history:response]', { symbol, ok: response.ok, status: response.status });
  const result = payload?.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const timestamps = result?.timestamp ?? [];

  const history = [];
  for (let i = 0; i < closes.length; i += 1) {
    const close = Number(closes[i]);
    const ts = Number(timestamps[i]);
    if (!Number.isFinite(close) || !Number.isFinite(ts)) continue;
    history.push({ time: new Date(ts * 1000).toISOString(), value: close });
  }

  if (history.length < 2) throw new Error('History unavailable');
  console.log('[provider][history:success]', { symbol, points: history.length });
  return history.slice(-120);
}

function ema(values, period) {
  const k = 2 / (period + 1);
  let emaValue = values[0] ?? 0;
  for (let i = 1; i < values.length; i += 1) {
    emaValue = values[i] * k + emaValue * (1 - k);
  }
  return emaValue;
}

function computeRsi(values, period = 14) {
  if (values.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function computeRiskScore(values) {
  if (values.length < 2) return 25;
  const returns = [];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] === 0) continue;
    returns.push((values[i] - values[i - 1]) / values[i - 1]);
  }
  if (returns.length === 0) return 25;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.min(100, Math.max(0, Math.sqrt(variance) * 2000));
}

function marketRegime(change) {
  if (change > 1) return 'bullish';
  if (change < -1) return 'bearish';
  return 'sideways';
}

function confidenceLevel(riskScore) {
  const normalized = 1 - Math.min(1, riskScore / 100);
  return Number((0.5 + normalized * 0.45).toFixed(2));
}

async function buildAnalysis({ symbol, question, assetType }) {
  const safeSymbol = normalizeSymbol(symbol);
  const safeQuestion = sanitizeText(question || 'Market snapshot') || 'Market snapshot';
  const safeAssetType = assetType === 'crypto' ? 'crypto' : 'stock';
  const ySymbol = yahooSymbol(safeSymbol, safeAssetType);
  console.log('[analysis][build:start]', { safeSymbol, safeAssetType, ySymbol });

  const [quote, history] = await Promise.all([fetchYahooQuote(ySymbol), fetchYahooHistory(ySymbol)]);
  const values = history.map((item) => item.value);
  const rsi = computeRsi(values);
  const macd = ema(values, 12) - ema(values, 26);
  const support = Math.min(...values.slice(-30));
  const resistance = Math.max(...values.slice(-30));
  const riskScore = computeRiskScore(values);
  const changePct = Number(quote.regularMarketChangePercent ?? 0);
  console.log('[analysis][build:success]', {
    safeSymbol,
    safeAssetType,
    points: values.length,
    price: Number(quote.regularMarketPrice ?? 0),
    changePct,
    riskScore
  });

  return {
    symbol: safeSymbol,
    question: safeQuestion,
    asset_type: safeAssetType,
    price: Number(quote.regularMarketPrice ?? 0),
    change_pct: changePct,
    volume: Number(quote.regularMarketVolume ?? 0),
    generated_at: new Date().toISOString(),
    indicators: {
      rsi,
      macd,
      trend_direction: values.at(-1) >= values[0] ? 'uptrend' : 'downtrend',
      support_resistance: { support, resistance }
    },
    risk: {
      risk_score: riskScore,
      explanation: riskScore > 60 ? 'High short-term volatility' : 'Moderate to low short-term volatility',
      market_regime: marketRegime(changePct)
    },
    sentiment: {
      label: changePct >= 0 ? 'positive' : 'negative',
      score: Math.max(-1, Math.min(1, changePct / 10))
    },
    history
  };
}

async function marketMovers(assetType) {
  console.log('[movers][start]', { assetType });
  const symbols = assetType === 'crypto'
    ? ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD', 'AVAX-USD']
    : ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'AMD'];

  const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`);
  const payload = await response.json();
  console.log('[movers][response]', { assetType, ok: response.ok, status: response.status });
  const items = (payload?.quoteResponse?.result ?? []).map((q) => ({
    symbol: assetType === 'crypto' ? String(q.symbol || '').replace('-USD', 'USDT') : String(q.symbol || ''),
    change_pct: Number(q.regularMarketChangePercent ?? 0),
    price: Number(q.regularMarketPrice ?? 0)
  }));
  console.log('[movers][success]', { assetType, count: items.length });
  return items.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/v1/markets/:symbol', async (req, res) => {
  try {
    console.log('[route][markets:get]', { requestId: req.requestId, symbol: req.params.symbol, query: req.query });
    const assetType = sanitizeText(req.query.asset_type || 'stock').toLowerCase();
    const analysis = await buildAnalysis({
      symbol: req.params.symbol,
      question: 'Market snapshot',
      assetType
    });
    res.json(analysis);
  } catch (error) {
    console.error('[route][markets:error]', { requestId: req.requestId, error });
    res.status(502).json({ detail: `Market provider failure: ${error.message}` });
  }
});

app.get('/api/v1/markets/trending/list', async (req, res) => {
  console.log('[route][trending:get]', { requestId: req.requestId, query: req.query });
  const assetType = sanitizeText(req.query.asset_type || 'stock').toLowerCase();
  const items = await marketMovers(assetType === 'crypto' ? 'crypto' : 'stock');
  res.json({ items: items.slice(0, 8) });
});

app.get('/api/v1/markets/movers/list', async (req, res) => {
  console.log('[route][movers:get]', { requestId: req.requestId, query: req.query });
  const assetType = sanitizeText(req.query.asset_type || 'stock').toLowerCase();
  const items = await marketMovers(assetType === 'crypto' ? 'crypto' : 'stock');
  res.json({ items: items.slice(0, 10) });
});

app.post('/api/v1/chat/analyze', async (req, res) => {
  try {
    console.log('[route][chat:analyze:start]', { requestId: req.requestId, body: req.body });
    const symbol = req.body.symbol || 'AAPL';
    const question = req.body.question || 'Market snapshot';
    const assetType = sanitizeText(req.body.asset_type || 'stock').toLowerCase();
    const userId = Number(req.body.user_id || 1);

    const context = await buildAnalysis({ symbol, question, assetType });
    const analysis = {
      summary: `${context.symbol} is in a ${context.risk.market_regime} regime with ${context.sentiment.label} sentiment.`,
      risk_notes: context.risk.explanation,
      confidence_level: confidenceLevel(context.risk.risk_score)
    };

    const chats = readJson(chatsPath);
    chats.unshift({
      id: Date.now(),
      user_id: userId,
      symbol: context.symbol,
      question: context.question,
      answer: JSON.stringify(analysis, null, 2),
      created_at: new Date().toISOString()
    });
    writeJson(chatsPath, chats.slice(0, 200));

    console.log('[route][chat:analyze:success]', { requestId: req.requestId, symbol: context.symbol, userId });
    res.json({ context, analysis });
  } catch (error) {
    console.error('[route][chat:analyze:error]', { requestId: req.requestId, error });
    res.status(502).json({ detail: `Analysis failed: ${error.message}` });
  }
});

app.get('/api/v1/chat/saved', (req, res) => {
  const userId = Number(req.query.user_id || 1);
  console.log('[route][chat:saved:get]', { requestId: req.requestId, userId });
  const chats = readJson(chatsPath);
  res.json({ items: chats.filter((item) => item.user_id === userId) });
});

app.get('/api/v1/watchlist', (req, res) => {
  const userId = Number(req.query.user_id || 1);
  console.log('[route][watchlist:get]', { requestId: req.requestId, userId });
  const rows = readJson(watchlistPath);
  res.json({ items: rows.filter((item) => item.user_id === userId) });
});

app.post('/api/v1/watchlist', (req, res) => {
  const symbol = normalizeSymbol(req.body.symbol);
  const userId = Number(req.body.user_id || 1);
  console.log('[route][watchlist:add:start]', { requestId: req.requestId, symbol, userId });
  if (!symbol) return res.status(400).json({ detail: 'Symbol is required' });

  const rows = readJson(watchlistPath);
  if (rows.some((item) => item.user_id === userId && item.symbol === symbol)) {
    const existing = rows.find((item) => item.user_id === userId && item.symbol === symbol);
    return res.json({ id: existing.id, symbol: existing.symbol });
  }

  const item = { id: Date.now(), user_id: userId, symbol, created_at: new Date().toISOString() };
  rows.unshift(item);
  writeJson(watchlistPath, rows);
  console.log('[route][watchlist:add:success]', { requestId: req.requestId, symbol, userId });
  return res.json({ id: item.id, symbol: item.symbol });
});

app.delete('/api/v1/watchlist/:symbol', (req, res) => {
  const symbol = normalizeSymbol(req.params.symbol);
  const userId = Number(req.query.user_id || 1);
  console.log('[route][watchlist:remove]', { requestId: req.requestId, symbol, userId });
  const rows = readJson(watchlistPath);
  const filtered = rows.filter((item) => !(item.user_id === userId && item.symbol === symbol));
  writeJson(watchlistPath, filtered);
  res.json({ removed: symbol });
});

app.listen(port, () => {
  console.log(`See-market backend running on ${port}`);
});
