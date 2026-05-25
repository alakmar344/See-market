'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LiveChart } from '@/components/live-chart';
import type { AssetType, MarketSnapshot, MoverItem } from '@/lib/api';
import { fetchDashboard } from '@/lib/api';

export default function DashboardPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [movers, setMovers] = useState<MoverItem[]>([]);
  const [trending, setTrending] = useState<MoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    console.log('[dashboard][load:start]', { symbol, assetType, active });

    fetchDashboard(symbol, assetType)
      .then(({ market, movers: moversRes, trending: trendingRes }) => {
        console.log('[dashboard][load:success]', {
          symbol,
          assetType,
          marketSymbol: market.symbol,
          moversCount: moversRes.items.length,
          trendingCount: trendingRes.items.length,
          active,
        });
        if (!active) return;
        setData(market);
        setMovers(moversRes.items);
        setTrending(trendingRes.items);
      })
      .catch((error) => {
        console.error('[dashboard][load:error]', { symbol, assetType, error, active });
        if (!active) return;
        setError('Could not load dashboard data.');
      })
      .finally(() => {
        console.log('[dashboard][load:done]', { symbol, assetType, active });
        if (!active) return;
        setLoading(false);
      });

    return () => {
      console.log('[dashboard][load:cleanup]', { symbol, assetType });
      active = false;
    };
  }, [assetType, symbol]);

  const safeSymbol = symbol.replace(/[^A-Z0-9._-]/g, '') || 'AAPL';

  if (loading) return <div className="panel h-48 animate-pulse p-4" />;
  if (error || !data) return <div className="panel p-4 text-red-300">{error || 'Could not load dashboard data.'}</div>;

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input className="sm:col-span-2" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Search symbol" />
        <select value={assetType} onChange={(e) => setAssetType(e.target.value as AssetType)}>
          <option value="stock">Stock</option>
          <option value="crypto">Crypto</option>
        </select>
        <Link href={`/markets/${encodeURIComponent(safeSymbol)}`} className="rounded-lg border border-indigo-300/20 bg-indigo-500 px-4 py-2 text-center text-sm font-semibold shadow-[0_10px_24px_rgba(79,70,229,0.3)] transition hover:bg-indigo-400">Open market</Link>
        <Link href="/chat" className="rounded-lg border border-white/20 px-4 py-2 text-center text-sm transition hover:bg-white/10">Ask AI</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Price</p><p className="text-xl font-semibold">{data.price.toFixed(2)}</p></div>
        <div className="panel p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Change</p><p className="text-xl font-semibold">{data.change_pct.toFixed(2)}%</p></div>
        <div className="panel p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Sentiment</p><p className="text-xl font-semibold capitalize">{data.sentiment.label}</p></div>
        <div className="panel p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Regime</p><p className="text-xl font-semibold">{data.risk.market_regime ?? 'n/a'}</p></div>
      </div>

      <LiveChart series={data.history} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Market movers</h3>
          <div className="space-y-2 text-sm">
            {movers.slice(0, 6).map((item) => (
              <div key={item.symbol} className="flex items-center justify-between rounded border border-white/10 px-3 py-2">
                <span>{item.symbol}</span>
                <span className={item.change_pct >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{item.change_pct.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-4">
          <h3 className="mb-3 text-sm font-semibold">Trending</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {trending.slice(0, 8).map((item) => (
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
