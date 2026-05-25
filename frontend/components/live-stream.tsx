'use client';

import { useEffect, useMemo, useState } from 'react';

import { createMarketSocket } from '@/lib/ws';

export function LiveStream({ symbol }: { symbol: string }) {
  const [message, setMessage] = useState('Waiting for stream...');
  const channel = useMemo(() => symbol.toLowerCase(), [symbol]);

  useEffect(() => {
    const ws = createMarketSocket(channel);
    let assembled = '';

    ws.onopen = () => ws.send(JSON.stringify({ symbol, question: 'Realtime overview', asset_type: 'crypto' }));
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type: string; payload: unknown };
      if (payload.type === 'context') {
        const context = payload.payload as { symbol: string; price: number; risk: { risk_score: number } };
        setMessage(`${context.symbol} ${context.price} | risk score ${Math.round(context.risk.risk_score)}\nStreaming analysis...`);
      }
      if (payload.type === 'delta') {
        assembled += String(payload.payload);
        setMessage(assembled.slice(-300));
      }
      if (payload.type === 'complete') {
        setMessage(String(payload.payload));
      }
    };
    ws.onerror = () => setMessage('WebSocket connection error');
    return () => ws.close();
  }, [channel, symbol]);

  return <pre className="panel max-h-56 overflow-auto whitespace-pre-wrap p-4 text-xs text-slate-300">{message}</pre>;
}
