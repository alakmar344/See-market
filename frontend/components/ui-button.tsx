import { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function UIButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50',
        props.className,
      )}
    />
  );
}
