'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { AIResponse } from '@/components/ai-response';
import { UIButton } from '@/components/ui-button';
import { askAI } from '@/lib/api';

export default function ChatPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [question, setQuestion] = useState('What is the current trend and risk profile?');
  const analyze = useMutation({ mutationFn: () => askAI(symbol, question, 'crypto') });

  return (
    <section className="space-y-4">
      <div className="panel grid gap-3 p-4 md:grid-cols-3">
        <input className="rounded border border-white/20 bg-black/40 px-3 py-2 text-sm" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <input className="rounded border border-white/20 bg-black/40 px-3 py-2 text-sm md:col-span-2" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <UIButton onClick={() => analyze.mutate()} disabled={analyze.isPending}>{analyze.isPending ? 'Analyzing...' : 'Ask AI'}</UIButton>
      </div>
      {analyze.data ? (
        <AIResponse content={JSON.stringify(analyze.data.analysis, null, 2)} confidence={Number(analyze.data.analysis.confidence_score ?? 0.7)} />
      ) : (
        <p className="text-sm text-slate-400">Run an analysis to see market reasoning.</p>
      )}
    </section>
  );
}
