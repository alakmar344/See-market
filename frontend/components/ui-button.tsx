import { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function UIButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'rounded-lg border border-indigo-300/20 bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(79,70,229,0.35)] transition hover:from-indigo-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-50',
        props.className,
      )}
    />
  );
}
