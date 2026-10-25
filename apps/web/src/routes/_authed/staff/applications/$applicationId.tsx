import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeft, Phone, User } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { DetailsCard } from '@/features/applications/details-card.tsx';
import { DocumentsCard } from '@/features/applications/documents-card.tsx';
import { LetterCard } from '@/features/applications/letter-card.tsx';
import { serviceTypesQuery } from '@/features/applications/queries.ts';
import { Timeline } from '@/features/applications/timeline.tsx';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { STAFF_ROLES } from '@/features/auth/session.ts';
import { AuditTrail } from '@/features/review/audit-trail.tsx';
import { staffApplicationQuery } from '@/features/review/queries.ts';
import { ReviewActions } from '@/features/review/review-actions.tsx';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { RouteParamHelper } from '@/lib/route-param.helper.ts';
import { MoneyHelper } from '@/lib/money.helper.ts';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/_authed/staff/applications/$applicationId')({
  params: {
    parse: (params) => ({ applicationId: RouteParamHelper.id(params.applicationId) }),
    stringify: (params) => ({ applicationId: String(params.applicationId) }),
  },
  beforeLoad: ({ context }) => RouteGuardHelper.requireRoles(context.user, STAFF_ROLES),
  loader: async ({ context, params }) => {
    const application = await context.queryClient.ensureQueryData(
      staffApplicationQuery(params.applicationId),
    );
    await context.queryClient.ensureQueryData(
      serviceTypesQuery(application.address.localLevelCode),
    );
  },
  component: ReviewPage,
});

function ReviewPage() {
  const { user } = Route.useRouteContext();
  const { applicationId } = Route.useParams();
  const { data: application } = useSuspenseQuery(staffApplicationQuery(applicationId));
  const { data: serviceTypes = [] } = useQuery(
    serviceTypesQuery(application.address.localLevelCode),
  );
  const serviceType = serviceTypes.find((t) => t.id === application.serviceType.id);

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/staff"
        className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {m.review_back()}
      </Link>
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
          <ReviewActions application={application} role={user.role} />
          {application.status === 'issued' && <LetterCard applicationId={application.id} />}
          <Card glass>
            <CardHeader>
              <CardTitle>{m.review_applicant()}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <span className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" aria-hidden />
                {application.applicant.name ?? m.staff_unnamed()}
              </span>
              <span className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-mono">
                  {LocaleHelper.digits(application.applicant.phone)}
                </span>
              </span>
            </CardContent>
          </Card>
          <DetailsCard
            application={application}
            formFields={serviceType?.formFields ?? []}
            editable={false}
          />
          {serviceType && (
            <DocumentsCard
              applicationId={application.id}
              requiredDocuments={serviceType.requiredDocuments}
              editable={false}
            />
          )}
        </div>
        <div className="flex flex-col gap-6">
          <Timeline applicationId={application.id} />
          <AuditTrail applicationId={application.id} />
        </div>
      </div>
    </div>
  );
}
