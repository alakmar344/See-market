'use client';

import { useQuery } from '@tanstack/react-query';

import { LiveChart } from '@/components/live-chart';
import { fetchMarket } from '@/lib/api';

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard', 'BTCUSDT'], queryFn: () => fetchMarket('BTCUSDT', 'crypto') });

  const chartData = (data?.history ?? Array.from({ length: 30 }, (_, i) => ({ time: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, value: 95 + i }))) as Array<{ time: string; value: number }>;

  if (isLoading) return <div className="panel h-48 animate-pulse p-4" />;
  if (error) return <div className="panel p-4 text-red-300">Could not load dashboard data.</div>;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="panel p-4"><p className="text-xs text-slate-400">Price</p><p className="text-xl font-semibold">{data.price}</p></div>
        <div className="panel p-4"><p className="text-xs text-slate-400">24h Change</p><p className="text-xl font-semibold">{data.change_pct}%</p></div>
        <div className="panel p-4"><p className="text-xs text-slate-400">Sentiment</p><p className="text-xl font-semibold capitalize">{data.sentiment.label}</p></div>
        <div className="panel p-4"><p className="text-xs text-slate-400">Risk Score</p><p className="text-xl font-semibold">{Math.round(data.risk.risk_score)}</p></div>
      </div>
      <LiveChart series={chartData} />
    </section>
  );
}
