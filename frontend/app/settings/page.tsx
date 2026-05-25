'use client';

import { useMarketStore } from '@/store/use-market-store';

export default function SettingsPage() {
  const darkMode = useMarketStore((s) => s.darkMode);
  const toggleDarkMode = useMarketStore((s) => s.toggleDarkMode);

  return (
    <section className="panel max-w-xl space-y-3 p-5">
      <h2 className="text-xl font-semibold">Settings</h2>
      <label className="flex items-center justify-between rounded border border-white/10 p-3 text-sm">
        <span>Dark mode</span>
        <button className="rounded bg-indigo-500 px-3 py-1" onClick={toggleDarkMode}>{darkMode ? 'On' : 'Off'}</button>
      </label>
      <p className="text-xs text-slate-400">Security defaults and cookies are enforced by backend middleware and JWT auth endpoints.</p>
    </section>
  );
}
