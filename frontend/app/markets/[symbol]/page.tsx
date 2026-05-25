'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { AIResponse } from '@/components/ai-response';
import { UIButton } from '@/components/ui-button';
import { fetchMarket } from '@/lib/api';

export default function MarketDetailsPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params?.symbol ?? 'AAPL').toUpperCase();
  const { data, isLoading } = useQuery({ queryKey: ['market', symbol], queryFn: () => fetchMarket(symbol, 'stock') });

  const saveScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${symbol}-chart.png`;
    link.click();
  };

  if (isLoading || !data) return <div className="panel h-40 animate-pulse" />;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="panel space-y-3 p-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{symbol}</h2>
          <UIButton onClick={saveScreenshot}>Capture chart screenshot</UIButton>
        </div>
        <p className="text-sm text-slate-300">Trend: {data.indicators.trend_direction}</p>
        <p className="text-sm text-slate-300">RSI: {data.indicators.rsi.toFixed(2)} | MACD: {data.indicators.macd.toFixed(2)}</p>
        <p className="text-sm text-slate-300">Support: {data.indicators.support_resistance.support.toFixed(2)} | Resistance: {data.indicators.support_resistance.resistance.toFixed(2)}</p>
      </div>
      <AIResponse content={`Risk: ${data.risk.explanation}\n\nSentiment: ${data.sentiment.label} (${data.sentiment.score.toFixed(2)})`} confidence={0.74} />
    </section>
  );
}
