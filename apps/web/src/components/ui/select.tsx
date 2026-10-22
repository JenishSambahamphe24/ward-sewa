import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn.ts';

interface SelectProps extends ComponentProps<'select'> {}

// Native select on purpose: with 753 municipalities the phone's own picker beats a custom list.
export function Select({ className, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-input bg-surface pr-9 pl-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-50 aria-invalid:border-danger',
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
