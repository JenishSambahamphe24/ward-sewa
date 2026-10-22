import { createFileRoute } from '@tanstack/react-router';
import { ComingNext } from '@/components/coming-next.tsx';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/_authed/applications/')({
  beforeLoad: ({ context }) => RouteGuardHelper.requireRoles(context.user, ['citizen']),
  component: () => <ComingNext title={m.nav_my_applications()} />,
});
