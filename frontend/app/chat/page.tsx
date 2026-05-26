'use client';

import { useEffect, useState } from 'react';

import { AIResponse } from '@/components/ai-response';
import { UIButton } from '@/components/ui-button';
import { askAI, fetchSavedChats, type AssetType, type ChatAnalysis, type MarketSnapshot, type SavedChatItem } from '@/lib/api';

export default function ChatPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [question, setQuestion] = useState('What is the current trend and risk profile?');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [saved, setSaved] = useState<SavedChatItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ context: MarketSnapshot; analysis: ChatAnalysis } | null>(null);

  useEffect(() => {
    let active = true;
    console.log('[chat][saved:init]', { active });
    fetchSavedChats()
      .then((data) => {
        console.log('[chat][saved:success]', { itemCount: data.items.length, active });
        if (!active) return;
        setSaved(data.items);
      })
      .catch((error) => {
        console.error('[chat][saved:error]', { error, active });
      })
      .finally(() => {
        console.log('[chat][saved:done]', { active });
        if (!active) return;
        setLoadingSaved(false);
      });

    return () => {
      console.log('[chat][saved:cleanup]');
      active = false;
    };
  }, []);

  const runAnalysis = async () => {
    console.log('[chat][analysis:start]', { symbol, assetType, questionLength: question.length });
    setAnalyzing(true);
    try {
      const result = await askAI(symbol, question, assetType);
      console.log('[chat][analysis:success]', { symbol, assetType, verdict: result.analysis.verdict });
      setAnalysisResult(result);
      const savedChats = await fetchSavedChats();
      console.log('[chat][analysis:saved-refresh]', { itemCount: savedChats.items.length });
      setSaved(savedChats.items);
    } catch (error) {
      console.error('[chat][analysis:error]', { error, symbol, assetType });
      setAnalysisResult(null);
    } finally {
      console.log('[chat][analysis:done]');
      setAnalyzing(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
        <select value={assetType} onChange={(e) => setAssetType(e.target.value as AssetType)}>
          <option value="stock">Stock</option>
          <option value="crypto">Crypto</option>
        </select>
        <input className="sm:col-span-2" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <UIButton onClick={runAnalysis} disabled={analyzing}>{analyzing ? 'Analyzing...' : 'Ask AI'}</UIButton>
      </div>

      {analysisResult
        ? <AIResponse chatAnalysis={analysisResult.analysis} context={analysisResult.context} />
        : <p className="text-sm text-slate-400">Run an analysis to see market reasoning.</p>}

      <div className="panel p-4">
        <h3 className="mb-3 text-sm font-semibold">Saved chats</h3>
        {loadingSaved ? <p className="text-sm text-slate-400">Loading...</p> : null}
        <div className="space-y-2 text-sm">
          {saved.slice(0, 6).map((item) => (
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
