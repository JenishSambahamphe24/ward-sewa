import type { SelectOption } from '@/components/ui/select.tsx';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import { STAFF_ROLE_OPTIONS } from './types.ts';
import type { StaffRole } from './types.ts';

const ROLE_LABEL = {
  ward_secretary: m.role_ward_secretary,
  ward_chair: m.role_ward_chair,
} as const;

export class StaffOptionsHelper {
  static roleLabel(role: StaffRole): string {
    return ROLE_LABEL[role]();
  }

  static roles(): SelectOption[] {
    return STAFF_ROLE_OPTIONS.map((role) => ({ value: role, label: ROLE_LABEL[role]() }));
  }

  static wards(wardCount: number): SelectOption[] {
    return Array.from({ length: wardCount }, (_, i) => ({
      value: String(i + 1),
      label: m.staff_ward_n({ ward: LocaleHelper.digits(i + 1) }),
    }));
  }
}
