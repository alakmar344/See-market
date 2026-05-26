'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = window.localStorage.getItem('onboarding_completed');
    setShowOnboarding(!completed);
  }, []);

  const completeOnboarding = () => {
    window.localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  return (
    <section className="space-y-6">
      {showOnboarding && (
        <div className="panel space-y-3 border-cyan-300/20 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 p-5">
          <h3 className="text-lg font-semibold">Welcome to See-market</h3>
          <p className="text-sm text-slate-300">Use the dashboard for live market snapshots and chat for quick market summaries.</p>
          <button className="rounded-lg border border-cyan-300/25 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30" onClick={completeOnboarding}>Finish onboarding</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="panel space-y-4 border-indigo-300/20 bg-gradient-to-br from-indigo-500/15 to-slate-900/70 p-6 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Simple Market Intelligence</p>
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl">Lightweight analytics with a mobile-friendly interface.</h2>
          <p className="max-w-2xl text-slate-300">Track prices, trend direction, volatility risk, and compact market commentary without heavy client libraries.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-lg border border-indigo-300/20 bg-indigo-500 px-4 py-2 text-sm font-semibold shadow-[0_10px_24px_rgba(79,70,229,0.35)] transition hover:bg-indigo-400">Open dashboard</Link>
            <Link href="/chat" className="rounded-lg border border-white/20 px-4 py-2 text-sm transition hover:bg-white/10">Market analysis</Link>
          </div>
        </div>
        <div className="panel p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Platform highlights</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>• yfinance-backed market snapshots</li>
            <li>• Lightweight indicator and risk metrics</li>
            <li>• Simple market summary output</li>
            <li>• Saved chats and watchlists</li>
            <li>• Mobile-first navigation layout</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
