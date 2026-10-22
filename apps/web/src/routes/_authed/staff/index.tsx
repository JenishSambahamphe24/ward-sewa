import { createFileRoute } from '@tanstack/react-router';
import { ComingNext } from '@/components/coming-next.tsx';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { STAFF_ROLES } from '@/features/auth/session.ts';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/_authed/staff/')({
  beforeLoad: ({ context }) => RouteGuardHelper.requireRoles(context.user, STAFF_ROLES),
  component: () => <ComingNext title={m.nav_queue()} />,
});
