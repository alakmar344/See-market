'use client';

import type { ChatAnalysis, MarketSnapshot } from '@/lib/api';

type StructuredProps = {
  chatAnalysis: ChatAnalysis;
  context: MarketSnapshot;
  content?: never;
  confidence?: never;
};

type PlainProps = {
  content: string;
  confidence: number;
  chatAnalysis?: never;
  context?: never;
};

type AIResponseProps = StructuredProps | PlainProps;

export function AIResponse(props: AIResponseProps) {
  if (props.chatAnalysis && props.context) {
    const { chatAnalysis: analysis, context } = props;
    const isBuy = analysis.verdict === 'buy';

    return (
      <section className="panel space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-200">AI Reasoning</h3>
          <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
            Confidence {Math.round(analysis.confidence_level * 100)}%
          </span>
        </div>

        <div className={`rounded-lg p-4 text-center ${isBuy ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
          <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Verdict</p>
          <p className={`text-xl font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
            {isBuy ? '✅ Yes, consider buying' : '❌ No, avoid buying'}
          </p>
        </div>

        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Summary</p>
          <p className="text-sm text-slate-200">{analysis.summary}</p>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Key Signals</p>
          <ul className="space-y-1">
            {analysis.verdict_reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                <span className="mt-0.5 text-slate-500">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Risk</p>
          <p className="text-sm text-slate-300">{analysis.risk_notes}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded bg-white/5 p-2">
            <p className="text-xs text-slate-500">Price</p>
            <p className="text-sm font-medium text-slate-200">${context.price.toLocaleString()}</p>
          </div>
          <div className="rounded bg-white/5 p-2">
            <p className="text-xs text-slate-500">Change</p>
            <p className={`text-sm font-medium ${context.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {context.change_pct >= 0 ? '+' : ''}{context.change_pct.toFixed(2)}%
            </p>
          </div>
          <div className="rounded bg-white/5 p-2">
            <p className="text-xs text-slate-500">RSI</p>
            <p className="text-sm font-medium text-slate-200">{context.indicators.rsi.toFixed(1)}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">AI Reasoning</h3>
        <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">Confidence {Math.round((props.confidence ?? 0) * 100)}%</span>
      </div>
      <pre className="overflow-auto whitespace-pre-wrap text-sm text-slate-200">{props.content}</pre>
    </section>
  );
}
