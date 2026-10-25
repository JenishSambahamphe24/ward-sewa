import { queryOptions } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client.ts';
import type { NewStaff, StaffChanges, StaffFilters, StaffMember } from './types.ts';

export const STAFF_KEY = ['staff'] as const;

export const staffQuery = (filters: StaffFilters) =>
  queryOptions({
    queryKey: [...STAFF_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.wardNo !== null) params.set('wardNo', String(filters.wardNo));
      if (filters.active !== null) params.set('active', filters.active);
      const query = params.size > 0 ? `?${params}` : '';
      return (await ApiClient.get<{ staff: StaffMember[] }>(`/admin/staff${query}`)).staff;
    },
  });

export class StaffApi {
  static async assign(input: NewStaff): Promise<StaffMember> {
    return (await ApiClient.post<{ staff: StaffMember }>('/admin/staff', { body: input })).staff;
  }

  static async update(id: number, changes: StaffChanges): Promise<StaffMember> {
    return (await ApiClient.patch<{ staff: StaffMember }>(`/admin/staff/${id}`, { body: changes }))
      .staff;
  }
}
