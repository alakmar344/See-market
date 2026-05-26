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
const CONNECTION_TIMEOUT_MS = 120_000;
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

const YFINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_HEADERS = Object.freeze({
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://finance.yahoo.com',
  Referer: 'https://finance.yahoo.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
});

function yfinanceSymbol(symbol, assetType) {
  if (assetType === 'crypto') {
    const base = symbol.endsWith('USDT')
      ? symbol.slice(0, -4)
      : symbol.endsWith('USD')
        ? symbol.slice(0, -3)
        : symbol;
    return `${base}-USD`;
  }
  return symbol;
}

async function fetchYfinanceChart(symbol, params = {}) {
  const url = new URL(`${YFINANCE_BASE_URL}/${encodeURIComponent(symbol)}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url.toString(), { headers: YAHOO_HEADERS });
  const payload = await response.json();
  if (!response.ok) throw new Error(`yfinance request failed (${response.status})`);
  const result = payload?.chart?.result?.[0];
  if (!result) {
    throw new Error(payload?.chart?.error?.description || 'Chart unavailable');
  }
  return result;
}

function buildHistoryFromChart(payload) {
  const closes = payload?.indicators?.quote?.[0]?.close ?? [];
  const timestamps = payload?.timestamp ?? [];
  const volumes = payload?.indicators?.quote?.[0]?.volume ?? [];
  const history = [];
  for (let i = 0; i < closes.length; i += 1) {
    const close = Number(closes[i]);
    const ts = Number(timestamps[i]);
    const volume = Number(volumes[i] ?? 0);
    if (!Number.isFinite(close) || !Number.isFinite(ts)) continue;
    history.push({ time: new Date(ts * 1000).toISOString(), value: close, volume });
  }
  return history.slice(-120);
}

function buildQuoteFromChart(payload, history) {
  const latestHistoryPoint = history.at(-1);
  const latestPrice = Number(payload?.meta?.regularMarketPrice ?? latestHistoryPoint?.value ?? 0);
  if (!Number.isFinite(latestPrice)) throw new Error('Quote unavailable');
  const fallbackPrevious = history.at(-2)?.value ?? latestPrice;
  const previousClose = Number(payload?.meta?.chartPreviousClose ?? payload?.meta?.previousClose ?? fallbackPrevious);
  const latestVolume = Number(latestHistoryPoint?.volume ?? 0);
  return {
    regularMarketPrice: latestPrice,
    regularMarketChangePercent: previousClose === 0 ? 0 : ((latestPrice - previousClose) / previousClose) * 100,
    regularMarketVolume: latestVolume
  };
}

async function fetchYfinanceSnapshot(symbol) {
  console.log('[provider][snapshot:start]', { symbol });
  const payload = await fetchYfinanceChart(symbol, {
    range: '1mo',
    interval: '1h',
    includePrePost: 'false',
    events: 'div,splits'
  });
  const history = buildHistoryFromChart(payload);
  if (history.length < 2) throw new Error('History unavailable');
  const quote = buildQuoteFromChart(payload, history);
  console.log('[provider][snapshot:success]', {
    symbol,
    marketPrice: quote.regularMarketPrice,
    points: history.length
  });
  return { quote, history };
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

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function stdDev(values) {
  if (values.length === 0) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function safePct(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return 0;
  return ((to - from) / Math.abs(from)) * 100;
}

function movingAverage(values, period, offset = 0) {
  const end = values.length - offset;
  const start = Math.max(0, end - period);
  const window = values.slice(start, end);
  return average(window);
}

function returnPct(values, hours) {
  const end = values.at(-1);
  const start = values.at(-1 - hours);
  return safePct(start, end);
}

function maxDrawdownPct(values, period) {
  const window = values.slice(-period);
  if (window.length === 0) return 0;
  let peak = window[0];
  let worst = 0;
  for (const price of window) {
    if (price > peak) peak = price;
    if (peak > 0) worst = Math.max(worst, ((peak - price) / peak) * 100);
  }
  return worst;
}

function positiveCandleRatio(values, period) {
  const window = values.slice(-period);
  if (window.length < 2) return 0.5;
  let positive = 0;
  for (let i = 1; i < window.length; i += 1) {
    if (window[i] > window[i - 1]) positive += 1;
  }
  return positive / (window.length - 1);
}

function buildDecisionMetrics(context) {
  const values = context.history.map((item) => Number(item.value)).filter((value) => Number.isFinite(value));
  const volumes = context.history.map((item) => Number(item.volume ?? 0)).map((value) => (Number.isFinite(value) ? value : 0));
  const currentPrice = values.at(-1) ?? 0;
  const support = context.indicators.support_resistance?.support ?? currentPrice;
  const resistance = context.indicators.support_resistance?.resistance ?? currentPrice;
  const range = Math.max(0.00001, resistance - support);

  const rsi6 = computeRsi(values, 6);
  const rsi9 = computeRsi(values, 9);
  const rsi14 = computeRsi(values, 14);
  const rsi21 = computeRsi(values, 21);
  const rsi14Prev = computeRsi(values.slice(0, -3), 14);
  const macdValue = ema(values, 12) - ema(values, 26);

  const returns1 = [];
  for (let i = 1; i < values.length; i += 1) {
    const change = safePct(values[i - 1], values[i]) / 100;
    returns1.push(change);
  }

  const vol = (period) => stdDev(returns1.slice(-period)) * 100;
  const sma5 = movingAverage(values, 5);
  const sma8 = movingAverage(values, 8);
  const sma13 = movingAverage(values, 13);
  const sma21 = movingAverage(values, 21);
  const sma34 = movingAverage(values, 34);
  const avgVol5 = average(volumes.slice(-5));
  const avgVol20 = average(volumes.slice(-20));
  const currentVol = volumes.at(-1) ?? 0;
  const obvSeries = [];
  let obv = 0;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > values[i - 1]) obv += volumes[i] ?? 0;
    else if (values[i] < values[i - 1]) obv -= volumes[i] ?? 0;
    obvSeries.push(obv);
  }
  const obvSlope = obvSeries.length < 11 ? 0 : safePct(obvSeries.at(-11), obvSeries.at(-1));

  const metrics = [];
  const addMetric = (name, value, score, detail) => {
    metrics.push({
      name,
      value: Number(Number.isFinite(value) ? value.toFixed(4) : 0),
      signal: score > 0 ? 'bullish' : score < 0 ? 'bearish' : 'neutral',
      score,
      detail
    });
  };

  const scoreReturn = (value, weak, strong) => (value >= strong ? 1 : value >= weak ? 0.5 : value <= -strong ? -1 : value <= -weak ? -0.5 : 0);
  const scoreNear = (value, low, high) => (value < low ? 1 : value > high ? -1 : 0);
  const scoreHighRisk = (value, warn, danger) => (value >= danger ? -1 : value >= warn ? -0.5 : 0.5);

  // 1-12 return metrics
  [1, 2, 3, 4, 6, 8, 12, 16, 24, 36, 48, 72].forEach((hours, index) => {
    const value = returnPct(values, hours);
    addMetric(`return_${hours}h`, value, scoreReturn(value, 0.2 + index * 0.03, 0.8 + index * 0.05), `${hours}h return`);
  });

  // 13-22 trend metrics
  addMetric('price_vs_sma5', safePct(sma5, currentPrice), scoreReturn(safePct(sma5, currentPrice), 0.2, 1.2), 'Price vs SMA 5');
  addMetric('price_vs_sma8', safePct(sma8, currentPrice), scoreReturn(safePct(sma8, currentPrice), 0.2, 1.2), 'Price vs SMA 8');
  addMetric('price_vs_sma13', safePct(sma13, currentPrice), scoreReturn(safePct(sma13, currentPrice), 0.2, 1.4), 'Price vs SMA 13');
  addMetric('price_vs_sma21', safePct(sma21, currentPrice), scoreReturn(safePct(sma21, currentPrice), 0.2, 1.5), 'Price vs SMA 21');
  addMetric('price_vs_sma34', safePct(sma34, currentPrice), scoreReturn(safePct(sma34, currentPrice), 0.2, 1.8), 'Price vs SMA 34');
  addMetric('sma5_vs_sma13', safePct(sma13, sma5), scoreReturn(safePct(sma13, sma5), 0.2, 1), 'Fast vs medium trend');
  addMetric('sma8_vs_sma21', safePct(sma21, sma8), scoreReturn(safePct(sma21, sma8), 0.2, 1), 'Fast vs slow trend');
  addMetric('sma13_slope_5h', safePct(movingAverage(values, 13, 5), sma13), scoreReturn(safePct(movingAverage(values, 13, 5), sma13), 0.1, 0.5), 'SMA13 slope');
  addMetric('sma21_slope_8h', safePct(movingAverage(values, 21, 8), sma21), scoreReturn(safePct(movingAverage(values, 21, 8), sma21), 0.1, 0.5), 'SMA21 slope');
  addMetric('macd_level', macdValue, macdValue > 0.15 ? 1 : macdValue > 0 ? 0.5 : macdValue < -0.15 ? -1 : macdValue < 0 ? -0.5 : 0, 'MACD direction');

  // 23-30 RSI & momentum exhaustion metrics
  addMetric('rsi_6', rsi6, scoreNear(rsi6, 35, 75), 'RSI 6');
  addMetric('rsi_9', rsi9, scoreNear(rsi9, 35, 72), 'RSI 9');
  addMetric('rsi_14', rsi14, scoreNear(rsi14, 35, 70), 'RSI 14');
  addMetric('rsi_21', rsi21, scoreNear(rsi21, 38, 68), 'RSI 21');
  addMetric('rsi14_change_3h', rsi14 - rsi14Prev, scoreReturn(rsi14 - rsi14Prev, 1, 4), 'RSI momentum shift');
  addMetric('rsi14_overheat_guard', rsi14, rsi14 >= 78 ? -1 : rsi14 >= 72 ? -0.5 : 0, 'RSI overheat guard');
  addMetric('rsi6_overbought_guard', rsi6, rsi6 >= 82 ? -1 : rsi6 >= 76 ? -0.5 : 0, 'Very short-term overbought');
  addMetric('rsi_price_divergence_proxy', returnPct(values, 6) - (rsi14 - rsi14Prev), returnPct(values, 6) > 1.2 && rsi14 < rsi14Prev ? -1 : 0, 'Price up while RSI weakens');

  // 31-38 volatility and downside metrics
  addMetric('volatility_5h', vol(5), scoreHighRisk(vol(5), 0.7, 1.4), 'Short volatility');
  addMetric('volatility_10h', vol(10), scoreHighRisk(vol(10), 0.7, 1.4), 'Medium volatility');
  addMetric('volatility_20h', vol(20), scoreHighRisk(vol(20), 0.8, 1.6), 'Long volatility');
  addMetric('atr_proxy_5h', average(returns1.slice(-5).map((v) => Math.abs(v))) * 100, scoreHighRisk(average(returns1.slice(-5).map((v) => Math.abs(v))) * 100, 0.6, 1.3), 'Average true range proxy');
  addMetric('max_drawdown_12h', maxDrawdownPct(values, 12), scoreHighRisk(maxDrawdownPct(values, 12), 2.5, 5), 'Drawdown 12h');
  addMetric('max_drawdown_24h', maxDrawdownPct(values, 24), scoreHighRisk(maxDrawdownPct(values, 24), 4, 8), 'Drawdown 24h');
  addMetric('max_drawdown_48h', maxDrawdownPct(values, 48), scoreHighRisk(maxDrawdownPct(values, 48), 6, 12), 'Drawdown 48h');
  addMetric('downside_upside_ratio_20h', Math.abs(average(returns1.slice(-20).filter((v) => v < 0))) / Math.max(0.0001, average(returns1.slice(-20).filter((v) => v > 0))), Math.abs(average(returns1.slice(-20).filter((v) => v < 0))) > average(returns1.slice(-20).filter((v) => v > 0)) ? -0.5 : 0.5, 'Downside pressure ratio');

  // 39-44 volume flow metrics
  addMetric('volume_vs_avg_5h', safePct(avgVol5, currentVol), scoreReturn(safePct(avgVol5, currentVol), 5, 25), 'Current volume vs 5h');
  addMetric('volume_vs_avg_20h', safePct(avgVol20, currentVol), scoreReturn(safePct(avgVol20, currentVol), 8, 35), 'Current volume vs 20h');
  addMetric('obv_slope_10h', obvSlope, scoreReturn(obvSlope, 1, 5), 'On-balance volume slope');
  addMetric('price_up_low_volume_penalty', returnPct(values, 3), returnPct(values, 3) > 1 && safePct(avgVol20, currentVol) < -20 ? -1 : 0, 'Up move without participation');
  addMetric('distribution_day_flag', currentPrice < (values.at(-2) ?? currentPrice) && currentVol > avgVol20 * 1.4 ? -1 : 0, currentVol, 'High-volume down candle');
  addMetric('accumulation_day_flag', currentPrice > (values.at(-2) ?? currentPrice) && currentVol > avgVol20 * 1.4 ? 1 : 0, currentVol, 'High-volume up candle');

  // 45-50 range/structure metrics
  addMetric('distance_from_support_30h', safePct(support, currentPrice), scoreReturn(safePct(support, currentPrice), 0.2, 1), 'Distance from support');
  addMetric('distance_from_resistance_30h', safePct(currentPrice, resistance), scoreReturn(safePct(currentPrice, resistance), 0.2, 1.2), 'Distance to resistance');
  addMetric('range_position_30h', ((currentPrice - support) / range) * 100, ((currentPrice - support) / range) > 0.8 ? -0.5 : ((currentPrice - support) / range) < 0.35 ? 0.5 : 0, 'Position inside range');
  addMetric('breakout_strength_30h', resistance === 0 ? 0 : safePct(resistance, currentPrice), safePct(resistance, currentPrice) > 0.6 ? 1 : safePct(resistance, currentPrice) < -1 ? -1 : 0, 'Breakout confirmation');
  addMetric('pullback_from_peak_12h', safePct(Math.max(...values.slice(-12), currentPrice), currentPrice), safePct(Math.max(...values.slice(-12), currentPrice), currentPrice) < -3 ? -0.5 : 0.5, 'Pullback depth');
  addMetric('trend_consistency_20h', positiveCandleRatio(values, 20) * 100, positiveCandleRatio(values, 20) > 0.62 ? 1 : positiveCandleRatio(values, 20) < 0.45 ? -1 : 0, 'Positive candle ratio');

  const overheatSignals = [];
  const sma20 = movingAverage(values, 20);
  const sd20 = stdDev(values.slice(-20));
  const upperBand = sma20 + sd20 * 2;
  if (rsi14 >= 72) overheatSignals.push('RSI 14 is overbought');
  if (rsi6 >= 78) overheatSignals.push('RSI 6 is overheated');
  if (currentPrice > upperBand && upperBand > 0) overheatSignals.push('Price is above upper volatility band');
  if (safePct(sma20, currentPrice) > 4.5) overheatSignals.push('Price is stretched above SMA 20');
  if (returnPct(values, 3) > 2.5 && returnPct(values, 12) > 5) overheatSignals.push('Short-term rally is too steep');

  const bullishSignals = metrics.filter((metric) => metric.score > 0).length;
  const bearishSignals = metrics.filter((metric) => metric.score < 0).length;
  const neutralSignals = metrics.length - bullishSignals - bearishSignals;
  let totalScore = metrics.reduce((sum, metric) => sum + metric.score, 0);

  if (overheatSignals.length >= 2) totalScore -= 2;
  if (overheatSignals.length >= 3) totalScore -= 3;

  return {
    metrics,
    totalScore,
    overheatSignals,
    bullishSignals,
    bearishSignals,
    neutralSignals
  };
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

function computeVerdict(context) {
  const decision = buildDecisionMetrics(context);
  const reasons = [];

  if (context.risk.market_regime === 'bullish') reasons.push('Market regime is bullish');
  if (context.risk.market_regime === 'bearish') reasons.push('Market regime is bearish');

  let finalScore = decision.totalScore;
  if (context.risk.risk_score >= 70) {
    finalScore -= 3;
    reasons.push(`Risk score is very high (${context.risk.risk_score.toFixed(1)})`);
  } else if (context.risk.risk_score >= 55) {
    finalScore -= 1.5;
    reasons.push(`Risk score is elevated (${context.risk.risk_score.toFixed(1)})`);
  } else {
    reasons.push(`Risk score is contained (${context.risk.risk_score.toFixed(1)})`);
  }

  if (decision.overheatSignals.length > 0) {
    reasons.push(...decision.overheatSignals.map((signal) => `${signal} — chase risk is high`));
  }

  const largestContributors = [...decision.metrics]
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 5)
    .map((item) => `${item.detail}: ${item.signal}`);
  reasons.push(...largestContributors);

  const hardNoBuy = decision.overheatSignals.length >= 3 && context.risk.risk_score >= 45;
  const verdict = hardNoBuy ? 'no_buy' : finalScore >= 8 ? 'buy' : 'no_buy';

  return {
    verdict,
    verdict_reasons: reasons.slice(0, 12),
    decision_score: Number(finalScore.toFixed(2)),
    metrics_evaluated: decision.metrics.length,
    metrics: decision.metrics,
    signal_balance: {
      bullish: decision.bullishSignals,
      bearish: decision.bearishSignals,
      neutral: decision.neutralSignals
    }
  };
}

async function buildAnalysis({ symbol, question, assetType }) {
  const safeSymbol = normalizeSymbol(symbol);
  const safeQuestion = sanitizeText(question || 'Market snapshot') || 'Market snapshot';
  const safeAssetType = assetType === 'crypto' ? 'crypto' : 'stock';
  const providerSymbol = yfinanceSymbol(safeSymbol, safeAssetType);
  console.log('[analysis][build:start]', { safeSymbol, safeAssetType, providerSymbol });

  const { quote, history } = await fetchYfinanceSnapshot(providerSymbol);

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
    ? ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT']
    : ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'AMD'];

  const items = await Promise.allSettled(symbols.map(async (symbol) => {
    const providerSymbol = yfinanceSymbol(symbol, assetType);
    const { quote } = await fetchYfinanceSnapshot(providerSymbol);
    return {
      symbol,
      change_pct: Number(quote.regularMarketChangePercent ?? 0),
      price: Number(quote.regularMarketPrice ?? 0)
    };
  }));
  const fulfilled = items
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
  console.log('[movers][response]', { assetType, requested: symbols.length, returned: fulfilled.length });
  console.log('[movers][success]', { assetType, count: items.length });
  return fulfilled.sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));
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

app.get('/api/v1/dashboard/:symbol', async (req, res) => {
  try {
    console.log('[route][dashboard:get]', { requestId: req.requestId, symbol: req.params.symbol, query: req.query });
    const assetType = sanitizeText(req.query.asset_type || 'stock').toLowerCase();
    const safeAssetType = assetType === 'crypto' ? 'crypto' : 'stock';
    const [market, items] = await Promise.all([
      buildAnalysis({
        symbol: req.params.symbol,
        question: 'Market snapshot',
        assetType: safeAssetType
      }),
      marketMovers(safeAssetType)
    ]);

    res.json({
      market,
      movers: { items: items.slice(0, 10) },
      trending: { items: items.slice(0, 8) }
    });
  } catch (error) {
    console.error('[route][dashboard:error]', { requestId: req.requestId, error });
    res.status(502).json({ detail: `Dashboard data failed: ${error.message}` });
  }
});

app.post('/api/v1/chat/analyze', async (req, res) => {
  try {
    console.log('[route][chat:analyze:start]', { requestId: req.requestId, body: req.body });
    const symbol = req.body.symbol || 'AAPL';
    const question = req.body.question || 'Market snapshot';
    const assetType = sanitizeText(req.body.asset_type || 'stock').toLowerCase();
    const userId = Number(req.body.user_id || 1);

    const context = await buildAnalysis({ symbol, question, assetType });
    const { verdict, verdict_reasons } = computeVerdict(context);
    const analysis = {
      summary: `${context.symbol} is in a ${context.risk.market_regime} regime with ${context.sentiment.label} sentiment.`,
      risk_notes: context.risk.explanation,
      confidence_level: confidenceLevel(context.risk.risk_score),
      verdict,
      verdict_reasons
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

const server = app.listen(port, () => {
  console.log(`See-market backend running on ${port}`);
});

server.keepAliveTimeout = CONNECTION_TIMEOUT_MS;
server.requestTimeout = CONNECTION_TIMEOUT_MS;
server.timeout = CONNECTION_TIMEOUT_MS;
server.headersTimeout = CONNECTION_TIMEOUT_MS + 5_000;
