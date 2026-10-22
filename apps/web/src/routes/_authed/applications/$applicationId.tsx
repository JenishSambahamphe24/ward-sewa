import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { StatusBadge } from '@/components/status-badge.tsx';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import type { Application } from '@/features/applications/types.ts';
import { ApiClient } from '@/lib/api-client.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';

const applicationQuery = (id: string) =>
  queryOptions({
    queryKey: ['applications', id],
    queryFn: async () =>
      (await ApiClient.get<{ application: Application }>(`/applications/${id}`)).application,
  });

export const Route = createFileRoute('/_authed/applications/$applicationId')({
  beforeLoad: ({ context }) => RouteGuardHelper.requireRoles(context.user, ['citizen']),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(applicationQuery(params.applicationId)),
  component: ApplicationPage,
});

function ApplicationPage() {
  const { applicationId } = Route.useParams();
  const { data: application } = useSuspenseQuery(applicationQuery(applicationId));
  return (
    <Card glass stripe="primary" className="mx-auto max-w-3xl">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-2xl">
            {LocaleHelper.pick(application.serviceType.nameNe, application.serviceType.nameEn)}
          </CardTitle>
          <StatusBadge status={application.status} />
        </div>
        <CardDescription>
          {m.application_tracking_no()}: <span className="font-mono">{application.trackingNo}</span>
        </CardDescription>
        <CardDescription>{m.coming_next()}</CardDescription>
      </CardHeader>
    </Card>
  );
}
