import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import { useTheme } from '@/components/theme-provider.tsx';
import { cn } from '@/lib/cn.ts';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

// Radix shows the placeholder whenever value is '', which is how a parent clears the choice.
export function Select({
  id,
  value,
  options,
  onValueChange,
  placeholder,
  disabled,
  invalid,
  className,
}: SelectProps) {
  const { portalContainer } = useTheme();
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid}
        className={cn(
          'group flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-surface px-3 text-left text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger data-placeholder:text-muted-foreground',
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={portalContainer}>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="relative z-50 max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) min-w-40 overflow-hidden rounded-lg border border-border bg-surface/95 text-surface-foreground shadow-lg backdrop-blur-md"
        >
          <SelectPrimitive.ScrollUpButton className="flex justify-center py-1 text-muted-foreground">
            <ChevronUp className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="max-h-72 p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer items-center rounded-md py-2 pr-8 pl-3 text-sm outline-none select-none data-disabled:opacity-50 data-highlighted:bg-primary/10 data-highlighted:text-primary data-[state=checked]:font-semibold"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex">
                  <Check className="size-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex justify-center py-1 text-muted-foreground">
            <ChevronDown className="size-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
