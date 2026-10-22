import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn.ts';

interface AlertProps extends ComponentProps<'div'> {
  tone?: 'danger' | 'success' | 'warning';
}

export function Alert({ className, tone = 'danger', ...props }: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'rounded-md border-l-4 bg-muted px-3 py-2 text-sm',
        {
          'border-l-danger': tone === 'danger',
          'border-l-success': tone === 'success',
          'border-l-warning': tone === 'warning',
        },
        className,
      )}
      {...props}
    />
  );
}
