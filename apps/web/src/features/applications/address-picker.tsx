import { DivisionHelper } from '@ward-sewa/nepal-utils';
import type { LocalLevel } from '@ward-sewa/nepal-utils';
import { useId } from 'react';
import { Label } from '@/components/ui/label.tsx';
import { Select } from '@/components/ui/select.tsx';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';

export interface AddressValue {
  provinceCode: string;
  districtCode: string;
  localLevelCode: string;
  wardNo: string;
}

export const EMPTY_ADDRESS: AddressValue = {
  provinceCode: '',
  districtCode: '',
  localLevelCode: '',
  wardNo: '',
};

const TYPE_LABEL = {
  metropolitan: m.local_level_metropolitan,
  sub_metropolitan: m.local_level_sub_metropolitan,
  municipality: m.local_level_municipality,
  rural_municipality: m.local_level_rural_municipality,
} as const satisfies Record<LocalLevel['type'], () => string>;

interface AddressPickerProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
}

// All 753 local levels and 6,743 wards come from nepal-utils in the browser: no API calls.
export function AddressPicker({ value, onChange }: AddressPickerProps) {
  const id = useId();
  const districts = value.provinceCode ? DivisionHelper.districtsOf(value.provinceCode) : [];
  const localLevels = value.districtCode ? DivisionHelper.localLevelsOf(value.districtCode) : [];
  const localLevel = value.localLevelCode
    ? DivisionHelper.getLocalLevel(value.localLevelCode)
    : null;
  const wardNumbers = Array.from({ length: localLevel?.wards ?? 0 }, (_, i) => i + 1);

  // Changing a level clears everything below it, so the address can never be inconsistent.
  const fields = [
    {
      key: 'province',
      label: m.address_province(),
      value: value.provinceCode,
      options: DivisionHelper.provinces.map((p) => ({ value: p.code, label: p.name })),
      onChange: (provinceCode: string) => onChange({ ...EMPTY_ADDRESS, provinceCode }),
    },
    {
      key: 'district',
      label: m.address_district(),
      value: value.districtCode,
      options: districts.map((d) => ({ value: d.code, label: d.name })),
      onChange: (districtCode: string) =>
        onChange({ ...EMPTY_ADDRESS, provinceCode: value.provinceCode, districtCode }),
    },
    {
      key: 'local-level',
      label: m.address_local_level(),
      value: value.localLevelCode,
      options: localLevels.map((l) => ({
        value: l.code,
        label: `${l.name} ${TYPE_LABEL[l.type]()}`,
      })),
      onChange: (localLevelCode: string) => onChange({ ...value, localLevelCode, wardNo: '' }),
    },
    {
      key: 'ward',
      label: m.address_ward(),
      value: value.wardNo,
      options: wardNumbers.map((n) => ({ value: String(n), label: LocaleHelper.digits(n) })),
      onChange: (wardNo: string) => onChange({ ...value, wardNo }),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-${field.key}`}>{field.label}</Label>
          <Select
            id={`${id}-${field.key}`}
            value={field.value}
            options={field.options}
            placeholder={m.address_choose()}
            disabled={field.options.length === 0}
            onValueChange={field.onChange}
          />
        </div>
      ))}
    </div>
  );
}
