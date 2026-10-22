import { queryOptions } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client.ts';

export type Role = 'citizen' | 'ward_secretary' | 'ward_chair' | 'municipality_admin';

export interface User {
  id: number;
  phone: string;
  name: string | null;
  role: Role;
  wardId: number | null;
  localLevelCode: string | null;
}

export const meQuery = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: async () => (await ApiClient.get<{ user: User }>('/auth/me')).user,
  staleTime: 5 * 60_000,
  retry: false,
});

export const ROLE_HOME = {
  citizen: '/applications',
  ward_secretary: '/staff',
  ward_chair: '/staff',
  municipality_admin: '/admin',
} as const satisfies Record<Role, string>;

export const STAFF_ROLES: Role[] = ['ward_secretary', 'ward_chair'];
