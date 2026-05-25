'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LiveStream } from '@/components/live-stream';
import { UIButton } from '@/components/ui-button';
import { addWatchlist, fetchWatchlist, removeWatchlist } from '@/lib/api';

export default function WatchlistPage() {
  const [symbol, setSymbol] = useState('');
  const client = useQueryClient();
  const watchlist = useQuery({ queryKey: ['watchlist'], queryFn: () => fetchWatchlist() });

  const add = useMutation({
    mutationFn: (value: string) => addWatchlist(value),
    onSuccess: () => client.invalidateQueries({ queryKey: ['watchlist'] }),
  });
  const remove = useMutation({
    mutationFn: (value: string) => removeWatchlist(value),
    onSuccess: () => client.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const firstSymbol = watchlist.data?.items?.[0]?.symbol ?? 'BTCUSDT';

  return (
    <section className="space-y-4">
      <div className="panel flex gap-2 p-4">
        <input className="flex-1" placeholder="Add symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <UIButton onClick={() => { if (symbol.trim()) add.mutate(symbol.trim()); setSymbol(''); }} disabled={add.isPending}>Add</UIButton>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(watchlist.data?.items ?? []).map((item) => (
          <div key={item.id} className="panel flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{item.symbol}</p>
              <Link className="text-xs text-indigo-300" href={`/markets/${item.symbol}`}>Open market page</Link>
            </div>
            <UIButton onClick={() => remove.mutate(item.symbol)} className="bg-rose-500 hover:bg-rose-400">Remove</UIButton>
          </div>
        ))}
      </div>

      <LiveStream symbol={firstSymbol} />
    </section>
  );
}
