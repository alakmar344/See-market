'use client';

export default function SettingsPage() {
  return (
    <section className="panel max-w-xl space-y-3 p-5">
      <h2 className="text-xl font-semibold">Settings</h2>
      <p className="rounded border border-white/10 p-3 text-sm text-slate-300">
        This simplified build keeps a single dark theme and a strict backend CORS allowlist for the production frontend URL.
      </p>
    </section>
  );
}
