'use client';

import { useQuery } from '@tanstack/react-query';

import { AIResponse } from '@/components/ai-response';
import { fetchMarket } from '@/lib/api';

export default function MarketDetailsPage({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const { data, isLoading } = useQuery({ queryKey: ['market', symbol], queryFn: () => fetchMarket(symbol, 'stock') });

  if (isLoading) return <div className="panel h-40 animate-pulse" />;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="panel space-y-2 p-4 lg:col-span-2">
        <h2 className="text-xl font-semibold">{symbol}</h2>
        <p className="text-sm text-slate-300">Trend: {data.indicators.trend_direction}</p>
        <p className="text-sm text-slate-300">RSI: {data.indicators.rsi.toFixed(2)} | MACD: {data.indicators.macd.toFixed(2)}</p>
        <p className="text-sm text-slate-300">Support: {data.indicators.support_resistance.support.toFixed(2)} | Resistance: {data.indicators.support_resistance.resistance.toFixed(2)}</p>
      </div>
      <AIResponse content={`Risk: ${data.risk.explanation}\n\nSentiment: ${data.sentiment.label} (${data.sentiment.score.toFixed(2)})`} confidence={0.74} />
    </section>
  );
}
