'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { AIResponse } from '@/components/ai-response';
import { UIButton } from '@/components/ui-button';
import { askAI, fetchSavedChats } from '@/lib/api';

export default function ChatPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [question, setQuestion] = useState('What is the current trend and risk profile?');
  const [assetType, setAssetType] = useState<'stock' | 'crypto'>('crypto');

  const analyze = useMutation({ mutationFn: () => askAI(symbol, question, assetType) });
  const saved = useQuery({ queryKey: ['saved-chats'], queryFn: () => fetchSavedChats() });

  return (
    <section className="space-y-4">
      <div className="panel grid gap-3 p-4 md:grid-cols-4">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <select value={assetType} onChange={(e) => setAssetType(e.target.value as 'stock' | 'crypto')}>
          <option value="crypto">Crypto</option>
          <option value="stock">Stock</option>
        </select>
        <input className="md:col-span-2" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <UIButton onClick={() => analyze.mutate()} disabled={analyze.isPending}>{analyze.isPending ? 'Analyzing...' : 'Ask AI'}</UIButton>
      </div>

      {analyze.data ? (
        <AIResponse content={JSON.stringify(analyze.data.analysis, null, 2)} confidence={Number(analyze.data.analysis.confidence_level ?? 0.7)} />
      ) : (
        <p className="text-sm text-slate-400">Run an analysis to see market reasoning.</p>
      )}

      <div className="panel p-4">
        <h3 className="mb-3 text-sm font-semibold">Saved chats</h3>
        <div className="space-y-2 text-sm">
          {(saved.data?.items ?? []).slice(0, 6).map((item) => (
            <details key={item.id} className="rounded border border-white/10 p-3">
              <summary className="cursor-pointer font-medium">{item.symbol} — {item.question}</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{item.answer}</pre>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
