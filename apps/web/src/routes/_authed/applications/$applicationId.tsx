import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { StatusBadge } from '@/components/status-badge.tsx';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { DetailsCard } from '@/features/applications/details-card.tsx';
import { DocumentsCard } from '@/features/applications/documents-card.tsx';
import { LetterCard } from '@/features/applications/letter-card.tsx';
import { applicationQuery, serviceTypesQuery } from '@/features/applications/queries.ts';
import { SubmitPanel } from '@/features/applications/submit-panel.tsx';
import { Timeline } from '@/features/applications/timeline.tsx';
import { EDITABLE_STATUSES } from '@/features/applications/types.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { RouteParamHelper } from '@/lib/route-param.helper.ts';
import { MoneyHelper } from '@/lib/money.helper.ts';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/_authed/applications/$applicationId')({
  params: {
    parse: (params) => ({ applicationId: RouteParamHelper.id(params.applicationId) }),
    stringify: (params) => ({ applicationId: String(params.applicationId) }),
  },
  beforeLoad: ({ context }) => RouteGuardHelper.requireRoles(context.user, ['citizen']),
  loader: async ({ context, params }) => {
    const application = await context.queryClient.ensureQueryData(
      applicationQuery(params.applicationId),
    );
    await context.queryClient.ensureQueryData(
      serviceTypesQuery(application.address.localLevelCode),
    );
  },
  component: ApplicationPage,
});

function ApplicationPage() {
  const { applicationId } = Route.useParams();
  const { data: application } = useSuspenseQuery(applicationQuery(applicationId));
  const { data: serviceTypes = [] } = useQuery(
    serviceTypesQuery(application.address.localLevelCode),
  );
  const serviceType = serviceTypes.find((t) => t.id === application.serviceType.id);
  const editable = EDITABLE_STATUSES.includes(application.status);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {LocaleHelper.pick(application.serviceType.nameNe, application.serviceType.nameEn)}
          </h1>
          <StatusBadge status={application.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {m.application_tracking_no()}:{' '}
          <span className="font-mono font-medium text-foreground">{application.trackingNo}</span>
          {' · '}
          {MoneyHelper.rupees(application.serviceType.fee)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          {serviceType && <SubmitPanel application={application} serviceType={serviceType} />}
          {application.status === 'issued' && <LetterCard applicationId={application.id} />}
          {serviceType && (
            <DocumentsCard
              applicationId={application.id}
              requiredDocuments={serviceType.requiredDocuments}
              editable={editable}
            />
          )}
          <DetailsCard
            key={application.version}
            application={application}
            formFields={serviceType?.formFields ?? []}
            editable={editable}
          />
        </div>
        <Timeline applicationId={application.id} />
      </div>
    </div>
  );
}
