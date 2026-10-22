import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context, location }) => {
    const user = await RouteGuardHelper.currentUser(context.queryClient);
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } });
    // A letter needs the applicant's full name, so citizens set it before anything else.
    if (user.role === 'citizen' && !user.name && location.pathname !== '/profile') {
      throw redirect({ to: '/profile' });
    }
    return { user };
  },
  component: Outlet,
});
