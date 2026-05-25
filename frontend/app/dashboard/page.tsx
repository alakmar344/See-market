'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { LiveChart } from '@/components/live-chart';
import { fetchMarket, fetchMovers, fetchTrending } from '@/lib/api';

export default function DashboardPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [assetType, setAssetType] = useState<'stock' | 'crypto'>('crypto');

  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard', symbol, assetType], queryFn: () => fetchMarket(symbol, assetType) });
  const movers = useQuery({ queryKey: ['movers', assetType], queryFn: () => fetchMovers(assetType) });
  const trending = useQuery({ queryKey: ['trending', assetType], queryFn: () => fetchTrending(assetType) });

  if (isLoading) return <div className="panel h-48 animate-pulse p-4" />;
  if (error || !data) return <div className="panel p-4 text-red-300">Could not load dashboard data.</div>;

  return (
    <section className="space-y-4">
      <div className="panel grid gap-3 p-4 md:grid-cols-5">
        <input className="rounded border border-white/20 bg-black/40 px-3 py-2 text-sm md:col-span-2" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Search symbol" />
        <select className="rounded border border-white/20 bg-black/40 px-3 py-2 text-sm" value={assetType} onChange={(e) => setAssetType(e.target.value as 'stock' | 'crypto')}>
          <option value="crypto">Crypto</option>
          <option value="stock">Stock</option>
        </select>
        <Link href={`/markets/${symbol}`} className="rounded bg-indigo-500 px-4 py-2 text-center text-sm font-semibold">Open market page</Link>
        <Link href="/chat" className="rounded border border-white/20 px-4 py-2 text-center text-sm">Ask AI</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="panel p-4"><p className="text-xs text-slate-400">Price</p><p className="text-xl font-semibold">{data.price}</p></div>
        <div className="panel p-4"><p className="text-xs text-slate-400">24h Change</p><p className="text-xl font-semibold">{data.change_pct}%</p></div>
        <div className="panel p-4"><p className="text-xs text-slate-400">Sentiment</p><p className="text-xl font-semibold capitalize">{data.sentiment.label}</p></div>
        <div className="panel p-4"><p className="text-xs text-slate-400">Risk Regime</p><p className="text-xl font-semibold">{data.risk.market_regime ?? 'n/a'}</p></div>
      </div>

      <LiveChart series={data.history} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Market movers</h3>
          <div className="space-y-2 text-sm">
            {(movers.data?.items ?? []).slice(0, 6).map((item) => (
              <div key={item.symbol} className="flex items-center justify-between rounded border border-white/10 px-3 py-2">
                <span>{item.symbol}</span>
                <span className={item.change_pct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{item.change_pct.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Trending heatmap</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(trending.data?.items ?? []).slice(0, 8).map((item) => (
              <div key={item.symbol} className={`rounded p-3 ${item.change_pct >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                <p className="font-semibold">{item.symbol}</p>
                <p>{item.change_pct.toFixed(2)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
