'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useMarketStore } from '@/store/use-market-store';

const links = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/chat', label: 'Chat' },
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/settings', label: 'Settings' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dark = useMarketStore((s) => s.darkMode);

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900 text-slate-100">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-md">
          <nav className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
            <h1 className="mr-4 text-sm font-semibold tracking-widest text-indigo-300">SEE-MARKET</h1>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${pathname === link.href ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
