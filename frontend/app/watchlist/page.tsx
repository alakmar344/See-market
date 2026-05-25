'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { UIButton } from '@/components/ui-button';
import { addWatchlist, fetchWatchlist, removeWatchlist, type WatchlistItem } from '@/lib/api';

export default function WatchlistPage() {
  const [symbol, setSymbol] = useState('');
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    console.log('[watchlist][refresh:start]');
    const list = await fetchWatchlist();
    console.log('[watchlist][refresh:success]', { itemCount: list.items.length });
    setItems(list.items);
  };

  useEffect(() => {
    refresh().catch((error) => {
      console.error('[watchlist][refresh:error]', { error });
    });
  }, []);

  const onAdd = async () => {
    const clean = symbol.trim();
    if (!clean) return;
    console.log('[watchlist][add:start]', { symbol: clean });
    setBusy(true);
    try {
      await addWatchlist(clean);
      console.log('[watchlist][add:success]', { symbol: clean });
      setSymbol('');
      await refresh();
    } catch (error) {
      console.error('[watchlist][add:error]', { symbol: clean, error });
    } finally {
      console.log('[watchlist][add:done]', { symbol: clean });
      setBusy(false);
    }
  };

  const onRemove = async (value: string) => {
    console.log('[watchlist][remove:start]', { symbol: value });
    setBusy(true);
    try {
      await removeWatchlist(value);
      console.log('[watchlist][remove:success]', { symbol: value });
      await refresh();
    } catch (error) {
      console.error('[watchlist][remove:error]', { symbol: value, error });
    } finally {
      console.log('[watchlist][remove:done]', { symbol: value });
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="panel flex flex-col gap-2 p-4 sm:flex-row">
        <input className="flex-1" placeholder="Add symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
        <UIButton onClick={onAdd} disabled={busy}>Add</UIButton>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="panel flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{item.symbol}</p>
              <Link className="text-xs text-indigo-300" href={`/markets/${item.symbol}`}>Open market page</Link>
            </div>
            <UIButton onClick={() => onRemove(item.symbol)} className="bg-rose-500 hover:bg-rose-400" disabled={busy}>Remove</UIButton>
          </div>
        ))}
      </div>
    </section>
  );
}
