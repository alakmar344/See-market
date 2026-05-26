'use client';

import { useEffect } from 'react';

import { pingBackend } from '@/lib/api';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let active = true;

    const heartbeat = () => {
      pingBackend().catch((error) => {
        if (!active) return;
        console.error('[providers][heartbeat:error]', { error });
      });
    };

    heartbeat();
    const intervalId = window.setInterval(heartbeat, 10_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return <>{children}</>;
}
