import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="panel space-y-4 p-6">
        <h2 className="text-3xl font-bold">Institutional-grade market intelligence.</h2>
        <p className="text-slate-300">Analyze stocks, crypto, risk, sentiment, and technical trends with a Gemma-powered reasoning layer grounded in computed market data.</p>
        <div className="space-x-3">
          <Link href="/dashboard" className="rounded bg-indigo-500 px-4 py-2 text-sm font-semibold">Open dashboard</Link>
          <Link href="/chat" className="rounded border border-white/20 px-4 py-2 text-sm">AI chat</Link>
        </div>
      </div>
      <div className="panel p-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Platform highlights</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>• Real-time WebSocket updates</li>
          <li>• Technical indicators and trend panel</li>
          <li>• Risk and sentiment intelligence</li>
          <li>• Streaming AI analysis with confidence scores</li>
        </ul>
      </div>
    </section>
  );
}
