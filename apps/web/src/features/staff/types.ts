export type StaffRole = 'ward_secretary' | 'ward_chair';

export interface StaffMember {
  id: number;
  phone: string;
  name: string | null;
  role: StaffRole;
  isActive: boolean;
  ward: { id: number; wardNo: number };
}

export interface StaffFilters {
  wardNo: number | null;
  active: 'true' | 'false' | null;
}

export interface NewStaff {
  phone: string;
  name: string;
  role: StaffRole;
  wardNo: number;
}

export interface StaffChanges {
  role?: StaffRole;
  wardNo?: number;
  isActive?: boolean;
}

export const STAFF_ROLE_OPTIONS: readonly StaffRole[] = ['ward_secretary', 'ward_chair'];
