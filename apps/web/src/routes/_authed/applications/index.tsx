import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { FilePlus2, FileText } from 'lucide-react';
import { useState } from 'react';
import { Pager } from '@/components/pager.tsx';
import { Alert } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { MyApplicationsList } from '@/features/applications/my-applications-list.tsx';
import { MY_APPLICATIONS_PAGE_SIZE, myApplicationsQuery } from '@/features/applications/queries.ts';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { ApiErrorHelper } from '@/lib/api-error.helper.ts';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/_authed/applications/')({
  beforeLoad: ({ context }) => RouteGuardHelper.requireRoles(context.user, ['citizen']),
  component: MyApplicationsPage,
});

function MyApplicationsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useQuery({
    ...myApplicationsQuery(page),
    placeholderData: keepPreviousData,
  });

  const newButton = (
    <Button asChild>
      <Link to="/applications/new">
        <FilePlus2 />
        {m.nav_new_application()}
      </Link>
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{m.nav_my_applications()}</h1>
          <p className="text-muted-foreground">{m.mine_intro()}</p>
        </div>
        {data && data.total > 0 && newButton}
      </header>

      <Card glass>
        <CardContent className="flex flex-col gap-4 pt-6">
          {error && <Alert>{ApiErrorHelper.message(error)}</Alert>}
          {isPending && <p className="py-8 text-center text-muted-foreground">{m.loading()}</p>}
          {data?.total === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="size-10 text-muted-foreground" aria-hidden />
              <p className="font-medium">{m.mine_empty()}</p>
              <p className="max-w-sm text-sm text-muted-foreground">{m.mine_empty_hint()}</p>
              {newButton}
            </div>
          )}
          {data && data.total > 0 && (
            <>
              <MyApplicationsList items={data.items} />
              <Pager
                page={page}
                pageSize={MY_APPLICATIONS_PAGE_SIZE}
                total={data.total}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
