import { Label as LabelPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn.ts';

interface LabelProps extends ComponentProps<typeof LabelPrimitive.Root> {}

export function Label({ className, ...props }: LabelProps) {
  return <LabelPrimitive.Root className={cn('text-sm font-medium', className)} {...props} />;
}
