import { useId } from 'react';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { cn } from '@/lib/cn.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import type { FormField } from './types.ts';

interface DynamicFieldsProps {
  fields: readonly FormField[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

// Renders whichever fields the chosen service type defines; there is no per-type code.
export function DynamicFields({ fields, values, errors, onChange }: DynamicFieldsProps) {
  const id = useId();
  return (
    <>
      {fields.map((field) => {
        const inputId = `${id}-${field.key}`;
        const error = errors[field.key] ?? null;
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor={inputId}>
              {LocaleHelper.pick(field.labelNe, field.labelEn)}
              {field.required && <span className="text-danger"> *</span>}
            </Label>
            <Input
              id={inputId}
              inputMode={field.type === 'date_bs' ? 'numeric' : undefined}
              placeholder={field.type === 'date_bs' ? 'YYYY-MM-DD' : undefined}
              value={values[field.key] ?? ''}
              onChange={(event) => onChange(field.key, event.target.value)}
              aria-invalid={error !== null}
              aria-describedby={`${inputId}-message`}
            />
            <p
              id={`${inputId}-message`}
              role={error === null ? undefined : 'alert'}
              className={cn('min-h-5 text-xs', {
                'font-medium text-danger': error !== null,
                'text-muted-foreground': error === null,
              })}
            >
              {error ?? (field.type === 'date_bs' ? m.field_bs_date_hint() : '')}
            </p>
          </div>
        );
      })}
    </>
  );
}
