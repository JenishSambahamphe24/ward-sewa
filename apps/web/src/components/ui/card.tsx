import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn.ts';

interface CardProps extends ComponentProps<'div'> {
  stripe?: 'primary' | 'accent' | 'highlight';
}

export function Card({ className, stripe, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-surface text-surface-foreground shadow-sm',
        {
          'border-t-4 border-t-primary': stripe === 'primary',
          'border-t-4 border-t-accent': stripe === 'accent',
          'border-t-4 border-t-highlight': stripe === 'highlight',
        },
        className,
      )}
      {...props}
    />
  );
}

interface CardHeaderProps extends ComponentProps<'div'> {}

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div className={cn('flex flex-col gap-1.5 p-5 pb-3', className)} {...props} />;
}

interface CardTitleProps extends ComponentProps<'h3'> {}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return <h3 className={cn('text-base leading-tight font-semibold', className)} {...props} />;
}

interface CardDescriptionProps extends ComponentProps<'p'> {}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

interface CardContentProps extends ComponentProps<'div'> {}

export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}

interface CardFooterProps extends ComponentProps<'div'> {}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t border-border px-5 py-3', className)}
      {...props}
    />
  );
}
