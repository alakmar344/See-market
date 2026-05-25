import './globals.css';

import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'See-market',
  description: 'AI-powered market intelligence platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
