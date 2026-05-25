'use client';

import { useEffect, useState } from 'react';

import { AIResponse } from '@/components/ai-response';
import { UIButton } from '@/components/ui-button';
import { askAI, fetchSavedChats, type AssetType, type SavedChatItem } from '@/lib/api';

export default function ChatPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [question, setQuestion] = useState('What is the current trend and risk profile?');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [saved, setSaved] = useState<SavedChatItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [confidence, setConfidence] = useState(0.7);

  useEffect(() => {
    let active = true;
    fetchSavedChats()
      .then((data) => {
        if (!active) return;
        setSaved(data.items);
      })
      .finally(() => {
        if (!active) return;
        setLoadingSaved(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await askAI(symbol, question, assetType);
      setAnalysisText(JSON.stringify(result.analysis, null, 2));
      setConfidence(Number(result.analysis.confidence_level ?? 0.7));
      const savedChats = await fetchSavedChats();
      setSaved(savedChats.items);
    } catch {
      setAnalysisText('Analysis failed. Please retry.');
      setConfidence(0.2);
    } finally {
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

      {analysisText ? <AIResponse content={analysisText} confidence={confidence} /> : <p className="text-sm text-slate-400">Run an analysis to see market reasoning.</p>}

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
