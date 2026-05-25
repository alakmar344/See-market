'use client';

import Link from 'next/link';
import { useState } from 'react';

import { UIButton } from '@/components/ui-button';
import { LiveStream } from '@/components/live-stream';
import { useMarketStore } from '@/store/use-market-store';

export default function WatchlistPage() {
  const [symbol, setSymbol] = useState('');
  const watchlist = useMarketStore((s) => s.watchlist);
  const addSymbol = useMarketStore((s) => s.addSymbol);
  const removeSymbol = useMarketStore((s) => s.removeSymbol);

  return (
    <section className="space-y-4">
      <div className="panel flex gap-2 p-4">
        <input className="flex-1 rounded border border-white/20 bg-black/40 px-3 py-2 text-sm" placeholder="Add symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <UIButton onClick={() => { addSymbol(symbol); setSymbol(''); }}>Add</UIButton>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {watchlist.map((item) => (
          <div key={item} className="panel flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{item}</p>
              <Link className="text-xs text-indigo-300" href={`/markets/${item}`}>Open market page</Link>
            </div>
            <UIButton onClick={() => removeSymbol(item)} className="bg-rose-500 hover:bg-rose-400">Remove</UIButton>
          </div>
        ))}
      </div>
      <LiveStream symbol={watchlist[0] ?? 'BTCUSDT'} />
    </section>
  );
}
