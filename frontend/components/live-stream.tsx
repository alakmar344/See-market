'use client';

import { useEffect, useMemo, useState } from 'react';

import { createMarketSocket } from '@/lib/ws';

export function LiveStream({ symbol }: { symbol: string }) {
  const [message, setMessage] = useState('Waiting for stream...');
  const channel = useMemo(() => symbol.toLowerCase(), [symbol]);

  useEffect(() => {
    const ws = createMarketSocket(channel);
    ws.onopen = () => ws.send(JSON.stringify({ symbol, question: 'Realtime overview', asset_type: 'crypto' }));
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      setMessage(`${payload.context.symbol} ${payload.context.price} | risk score ${Math.round(payload.context.risk.risk_score)}`);
    };
    ws.onerror = () => setMessage('WebSocket connection error');
    return () => ws.close();
  }, [channel, symbol]);

  return <div className="panel p-4 text-sm text-slate-300">{message}</div>;
}
