'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/chat', label: 'Chat' },
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/settings', label: 'Settings' }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto px-3 py-3">
          <h1 className="mr-1 shrink-0 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-cyan-200">SEE-MARKET</h1>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${pathname === link.href ? 'bg-white/15 text-white shadow-inner' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-4 sm:py-8">{children}</main>
    </div>
  );
}
