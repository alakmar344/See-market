'use client';

export function AIResponse({ content, confidence }: { content: string; confidence: number }) {
  return (
    <section className="panel space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-200">AI Reasoning</h3>
        <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">Confidence {Math.round(confidence * 100)}%</span>
      </div>
      <pre className="overflow-auto whitespace-pre-wrap text-sm text-slate-200">{content}</pre>
    </section>
  );
}
