import { redirect } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client.ts';
import type { Role, User } from './session.ts';
import { ROLE_HOME, meQuery } from './session.ts';

export class RouteGuardHelper {
  static async currentUser(queryClient: QueryClient): Promise<User | null> {
    if (!ApiClient.token()) return null;
    try {
      return await queryClient.ensureQueryData(meQuery);
    } catch {
      ApiClient.setToken(null);
      return null;
    }
  }

  // Throws TanStack Router redirects, which stop the page from loading at all.
  static requireRoles(user: User, roles: readonly Role[]): void {
    if (!roles.includes(user.role)) throw redirect({ to: ROLE_HOME[user.role] });
  }
}
