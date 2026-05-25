const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
let requestCounter = 0;

export type AssetType = 'stock' | 'crypto';

export type MarketSnapshot = {
  symbol: string;
  price: number;
  change_pct: number;
  volume: number;
  sentiment: { label: string; score: number };
  risk: { risk_score: number; explanation: string; market_regime?: string };
  indicators: {
    rsi: number;
    macd: number;
    trend_direction: string;
    support_resistance: { support: number; resistance: number };
  };
  history: Array<{ time: string; value: number }>;
};

export type MoverItem = { symbol: string; change_pct: number; price: number };
export type SavedChatItem = { id: number; symbol: string; question: string; answer: string; created_at: string };
export type WatchlistItem = { id: number; symbol: string; created_at: string };

async function jsonRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const requestId = `req-${Date.now()}-${++requestCounter}`;
  const method = init?.method ?? 'GET';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...(init?.headers ?? {}),
  };

  console.log('[api][request:start]', { requestId, method, input, body: init?.body ?? null, headers });

  const startedAt = Date.now();

  try {
    const response = await fetch(input, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
    const durationMs = Date.now() - startedAt;
    const contentType = response.headers.get('content-type');

    console.log('[api][request:response]', {
      requestId,
      method,
      input,
      status: response.status,
      ok: response.ok,
      durationMs,
      contentType,
    });

    const responseBody = (await response.json()) as T;

    console.log('[api][request:parsed]', {
      requestId,
      method,
      input,
      status: response.status,
      durationMs,
      responseBody,
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return responseBody;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('[api][request:error]', {
      requestId,
      method,
      input,
      durationMs,
      error,
    });
    throw error;
  }
}

export function fetchMarket(symbol: string, assetType: AssetType = 'stock') {
  return jsonRequest<MarketSnapshot>(`${API_URL}/api/v1/markets/${symbol}?asset_type=${assetType}`, { method: 'GET' });
}

export function askAI(symbol: string, question: string, assetType: AssetType, userId = 1) {
  const params = new URLSearchParams({ symbol, question, asset_type: assetType, user_id: String(userId) });
  return jsonRequest<{ context: MarketSnapshot; analysis: Record<string, unknown> }>(`${API_URL}/api/v1/chat/analyze`, {
    method: 'POST',
    body: params,
  });
}

export function fetchMovers(assetType: AssetType) {
  return jsonRequest<{ items: MoverItem[] }>(`${API_URL}/api/v1/markets/movers/list?asset_type=${assetType}`, { method: 'GET', headers: {} });
}

export function fetchTrending(assetType: AssetType) {
  return jsonRequest<{ items: MoverItem[] }>(`${API_URL}/api/v1/markets/trending/list?asset_type=${assetType}`, { method: 'GET', headers: {} });
}

export function fetchSavedChats(userId = 1) {
  return jsonRequest<{ items: SavedChatItem[] }>(`${API_URL}/api/v1/chat/saved?user_id=${userId}`, { method: 'GET', headers: {} });
}

export function fetchWatchlist(userId = 1) {
  return jsonRequest<{ items: WatchlistItem[] }>(`${API_URL}/api/v1/watchlist?user_id=${userId}`, { method: 'GET', headers: {} });
}

export function addWatchlist(symbol: string, userId = 1) {
  const body = new URLSearchParams({ symbol, user_id: String(userId) });
  return jsonRequest<{ id: number; symbol: string }>(`${API_URL}/api/v1/watchlist`, { method: 'POST', body });
}

export function removeWatchlist(symbol: string, userId = 1) {
  return jsonRequest<{ removed: string }>(`${API_URL}/api/v1/watchlist/${symbol}?user_id=${userId}`, {
    method: 'DELETE',
    headers: {},
  });
}
