import type { ReactNode } from 'react';
import { cn } from '@/lib/cn.ts';

interface RibbonProps {
  tone?: 'primary' | 'accent' | 'highlight';
  children: ReactNode;
}

// A diagonal corner ribbon; the parent needs `relative overflow-hidden` (Card has both).
export function Ribbon({ tone = 'highlight', children }: RibbonProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-4 -right-9 w-36 rotate-45 py-1 text-center text-xs font-semibold shadow-sm',
        {
          'bg-primary text-primary-foreground': tone === 'primary',
          'bg-accent text-accent-foreground': tone === 'accent',
          'bg-highlight text-highlight-foreground': tone === 'highlight',
        },
      )}
    >
      {children}
    </div>
  );
}
