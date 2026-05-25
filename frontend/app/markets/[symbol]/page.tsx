'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AIResponse } from '@/components/ai-response';
import { UIButton } from '@/components/ui-button';
import { fetchMarket, type MarketSnapshot } from '@/lib/api';

export default function MarketDetailsPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params?.symbol ?? 'AAPL').toUpperCase();
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMarket(symbol, 'stock')
      .then((response) => {
        if (!active) return;
        setData(response);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [symbol]);

  const saveSnapshot = () => {
    if (!data) return;
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${symbol}-snapshot.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) return <div className="panel h-40 animate-pulse" />;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="panel space-y-3 p-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">{symbol}</h2>
          <UIButton onClick={saveSnapshot}>Download market snapshot</UIButton>
        </div>
        <p className="text-sm text-slate-300">Trend: {data.indicators.trend_direction}</p>
        <p className="text-sm text-slate-300">RSI: {data.indicators.rsi.toFixed(2)} | MACD: {data.indicators.macd.toFixed(2)}</p>
        <p className="text-sm text-slate-300">Support: {data.indicators.support_resistance.support.toFixed(2)} | Resistance: {data.indicators.support_resistance.resistance.toFixed(2)}</p>
      </div>
      <AIResponse content={`Risk: ${data.risk.explanation}\n\nSentiment: ${data.sentiment.label} (${data.sentiment.score.toFixed(2)})`} confidence={0.74} />
    </section>
  );
}
