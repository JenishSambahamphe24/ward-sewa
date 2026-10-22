import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn.ts';

export const Tabs = TabsPrimitive.Root;

interface TabsListProps extends ComponentProps<typeof TabsPrimitive.List> {}

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex gap-1 border-b border-border', className)}
      {...props}
    />
  );
}

interface TabsTriggerProps extends ComponentProps<typeof TabsPrimitive.Trigger> {}

// Active tab: maroon label over a mustard underline.
export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative -mb-px px-3 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full data-[state=active]:text-primary data-[state=active]:after:bg-highlight',
        className,
      )}
      {...props}
    />
  );
}

interface TabsContentProps extends ComponentProps<typeof TabsPrimitive.Content> {}

export function TabsContent({ className, ...props }: TabsContentProps) {
  return <TabsPrimitive.Content className={cn('pt-4 outline-none', className)} {...props} />;
}
