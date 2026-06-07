'use client';

import { useEffect, useState } from 'react';

import { AnalysisResponse } from '@/components/analysis-response';
import { UIButton } from '@/components/ui-button';
import {
  runAnalysis as callAnalysis,
  fetchSavedChats,
  type AssetType,
  type ChatAnalysis,
  type MarketSnapshot,
  type SavedChatItem,
} from '@/lib/api';
import { useTheme } from '@/components/providers';

export default function ChatPage() {
  const { aiSettings } = useTheme();
  const [symbol, setSymbol] = useState('AAPL');
  const [question, setQuestion] = useState('What is the current trend and risk profile?');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [saved, setSaved] = useState<SavedChatItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    context: MarketSnapshot;
    analysis: ChatAnalysis;
  } | null>(null);

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
    console.log('[chat][analysis:start]', {
      symbol,
      assetType,
      questionLength: question.length,
      aiTone: aiSettings?.tone,
    });
    setAnalyzing(true);
    try {
      const result = await callAnalysis(symbol, question, assetType);
      console.log('[chat][analysis:success]', {
        symbol,
        assetType,
        verdict: result.analysis.verdict,
        hasAiReview: !!result.analysis.ai_review,
      });
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
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Symbol" />
        <select value={assetType} onChange={(e) => setAssetType(e.target.value as AssetType)}>
          <option value="stock">Stock</option>
          <option value="crypto">Crypto</option>
        </select>
        <input
          className="sm:col-span-2"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Your question..."
        />
        <UIButton onClick={runAnalysis} disabled={analyzing}>
          {analyzing ? 'Analyzing...' : 'Analyze'}
        </UIButton>
      </div>

      {analysisResult ? (
        <div className="space-y-4">
          <AnalysisResponse chatAnalysis={analysisResult.analysis} context={analysisResult.context} />

          {/* AI Review Section */}
          {analysisResult.analysis.ai_review && (
            <div className="panel space-y-3 p-4">
              <div>
                <h3 className="font-semibold">🤖 AI Market Review</h3>
                <p className="text-xs text-slate-400">
                  Analysis by GLM 5.1 (Tone: {aiSettings?.tone || 'professional'})
                </p>
              </div>
              <div className="rounded border border-indigo-500/30 bg-indigo-500/5 p-3 text-sm leading-relaxed text-slate-300">
                <p className="whitespace-pre-wrap">{analysisResult.analysis.ai_review}</p>
              </div>
              {analysisResult.analysis.ai_review_data && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-slate-400">Data Snapshot</summary>
                  <pre className="mt-2 overflow-auto rounded bg-slate-950/50 p-2 text-slate-300">
                    {JSON.stringify(analysisResult.analysis.ai_review_data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Run an analysis to see market reasoning and AI review.</p>
      )}

      <div className="panel p-4">
        <h3 className="mb-3 text-sm font-semibold">Saved chats</h3>
        {loadingSaved ? <p className="text-sm text-slate-400">Loading...</p> : null}
        <div className="space-y-2 text-sm">
          {saved.slice(0, 6).map((item) => (
            <details key={item.id} className="rounded border border-white/10 p-3">
              <summary className="cursor-pointer font-medium">
                {item.symbol} — {item.question}
              </summary>
              <div className="mt-2 space-y-2">
                <pre className="overflow-auto whitespace-pre-wrap text-xs text-slate-300">{item.answer}</pre>
                {item.ai_review && (
                  <div className="rounded border border-indigo-500/20 bg-indigo-500/5 p-2 text-xs text-slate-300">
                    <p className="font-medium text-indigo-300">AI Review:</p>
                    <p className="mt-1 whitespace-pre-wrap">{item.ai_review}</p>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
