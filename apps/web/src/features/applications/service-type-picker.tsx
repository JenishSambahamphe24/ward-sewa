import { useQuery } from '@tanstack/react-query';
import { Check, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/cn.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { MoneyHelper } from '@/lib/money.helper.ts';
import { m } from '@/paraglide/messages.js';
import { serviceTypesQuery } from './queries.ts';
import type { ServiceType } from './types.ts';

interface ServiceTypePickerProps {
  localLevelCode: string;
  value: ServiceType | null;
  onChange: (serviceType: ServiceType) => void;
}

export function ServiceTypePicker({ localLevelCode, value, onChange }: ServiceTypePickerProps) {
  const { data, isPending } = useQuery({
    ...serviceTypesQuery(localLevelCode),
    enabled: localLevelCode !== '',
  });

  if (!localLevelCode) {
    return <p className="text-sm text-muted-foreground">{m.service_choose_address_first()}</p>;
  }
  if (isPending) return <p className="text-sm text-muted-foreground">{m.service_loading()}</p>;
  if (!data?.length)
    return <p className="text-sm text-muted-foreground">{m.service_none_here()}</p>;

  return (
    <div
      role="radiogroup"
      aria-label={m.apply_step_service()}
      className="grid gap-3 sm:grid-cols-2"
    >
      {data.map((serviceType) => {
        const selected = value?.id === serviceType.id;
        return (
          <button
            key={serviceType.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(serviceType)}
            className={cn(
              'flex flex-col gap-2 rounded-xl border bg-surface/80 p-4 text-left transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
              {
                'border-primary shadow-md ring-1 ring-primary': selected,
                'border-border hover:border-accent hover:shadow-sm': !selected,
              },
            )}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="font-semibold">
                {LocaleHelper.pick(serviceType.nameNe, serviceType.nameEn)}
              </span>
              {selected && <Check className="size-5 shrink-0 text-primary" aria-hidden />}
            </span>
            <Badge tone="highlight" className="self-start">
              {MoneyHelper.rupees(serviceType.fee)}
            </Badge>
            <span className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {m.service_documents()}:{' '}
              {serviceType.requiredDocuments
                .map((doc) => LocaleHelper.pick(doc.nameNe, doc.nameEn))
                .join(', ')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
