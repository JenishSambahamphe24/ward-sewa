import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { STAFF_ROLES } from '@/features/auth/session.ts';
import { QUEUE_PAGE_SIZE, queueQuery } from '@/features/review/queries.ts';
import { QueueList } from '@/features/review/queue-list.tsx';
import type { QueueStatus } from '@/features/review/types.ts';
import { ApiErrorHelper } from '@/lib/api-error.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';

const ALL = 'all';
const TABS: readonly { value: QueueStatus | typeof ALL; label: () => string }[] = [
  { value: 'submitted', label: m.status_submitted },
  { value: 'under_review', label: m.status_under_review },
  { value: 'approved', label: m.status_approved },
  { value: 'needs_info', label: m.status_needs_info },
  { value: 'rejected', label: m.status_rejected },
  { value: 'issued', label: m.status_issued },
  { value: ALL, label: m.staff_status_all },
];

export const Route = createFileRoute('/_authed/staff/')({
  beforeLoad: ({ context }) => RouteGuardHelper.requireRoles(context.user, STAFF_ROLES),
  component: QueuePage,
});

function QueuePage() {
  const { user } = Route.useRouteContext();
  // Each role opens on the step that waits for them: the secretary starts, the chair approves.
  const [status, setStatus] = useState<QueueStatus | null>(
    user.role === 'ward_chair' ? 'under_review' : 'submitted',
  );
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useQuery({
    ...queueQuery({ status, page }),
    placeholderData: keepPreviousData,
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / QUEUE_PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">{m.queue_heading()}</h1>
        <p className="text-muted-foreground">{m.queue_intro()}</p>
      </header>

      <Card glass>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="overflow-x-auto">
            <Tabs
              value={status ?? ALL}
              onValueChange={(value) => {
                setStatus(value === ALL ? null : (value as QueueStatus));
                setPage(1);
              }}
            >
              <TabsList>
                {TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="whitespace-nowrap">
                    {tab.label()}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {error && <Alert>{ApiErrorHelper.message(error)}</Alert>}
          {isPending && <p className="py-8 text-center text-muted-foreground">{m.loading()}</p>}
          {data && <QueueList items={data.items} />}

          {data && pages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {m.action_previous()}
              </Button>
              <span className="text-sm text-muted-foreground">
                {m.queue_page({
                  page: LocaleHelper.digits(page),
                  pages: LocaleHelper.digits(pages),
                  total: LocaleHelper.digits(data.total),
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                {m.action_next()}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
