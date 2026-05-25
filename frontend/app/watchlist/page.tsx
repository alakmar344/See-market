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
    const list = await fetchWatchlist();
    setItems(list.items);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onAdd = async () => {
    const clean = symbol.trim();
    if (!clean) return;
    setBusy(true);
    try {
      await addWatchlist(clean);
      setSymbol('');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (value: string) => {
    setBusy(true);
    try {
      await removeWatchlist(value);
      await refresh();
    } finally {
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
