import { createFileRoute } from '@tanstack/react-router';
import { ComingNext } from '@/components/coming-next.tsx';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/_authed/admin/')({
  beforeLoad: ({ context }) => RouteGuardHelper.requireRoles(context.user, ['municipality_admin']),
  component: () => <ComingNext title={m.nav_staff()} />,
});
