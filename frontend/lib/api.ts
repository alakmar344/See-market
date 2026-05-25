const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function fetchMarket(symbol: string, assetType: 'stock' | 'crypto' = 'stock') {
  const response = await fetch(`${API_URL}/api/v1/markets/${symbol}?asset_type=${assetType}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load market data');
  return response.json();
}

export async function askAI(symbol: string, question: string, assetType: 'stock' | 'crypto') {
  const params = new URLSearchParams({ symbol, question, asset_type: assetType });
  const response = await fetch(`${API_URL}/api/v1/chat/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!response.ok) throw new Error('Analysis request failed');
  return response.json();
}
