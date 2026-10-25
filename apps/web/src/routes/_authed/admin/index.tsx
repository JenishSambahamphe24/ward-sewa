import { DivisionHelper } from '@ward-sewa/nepal-utils';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { useId, useState } from 'react';
import { Alert } from '@/components/ui/alert.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Select } from '@/components/ui/select.tsx';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { AssignStaffDialog } from '@/features/staff/assign-staff-dialog.tsx';
import { staffQuery } from '@/features/staff/queries.ts';
import { StaffOptionsHelper } from '@/features/staff/staff-options.helper.ts';
import { StaffRow } from '@/features/staff/staff-row.tsx';
import type { StaffFilters } from '@/features/staff/types.ts';
import { ApiErrorHelper } from '@/lib/api-error.helper.ts';
import { m } from '@/paraglide/messages.js';

const ALL = 'all';

export const Route = createFileRoute('/_authed/admin/')({
  beforeLoad: ({ context }) => RouteGuardHelper.requireRoles(context.user, ['municipality_admin']),
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext();
  const wardFilterId = useId();
  const [filters, setFilters] = useState<StaffFilters>({ wardNo: null, active: 'true' });
  const { data: staff, isPending, error } = useQuery(staffQuery(filters));
  // A municipality admin always has a local level (a database check constraint).
  const localLevel = DivisionHelper.getLocalLevel(user.localLevelCode as string);
  const wardCount = localLevel?.wards ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{m.admin_heading()}</h1>
          <p className="text-muted-foreground">
            {m.admin_intro({ municipality: localLevel?.name ?? '' })}
          </p>
        </div>
        <AssignStaffDialog wardCount={wardCount} />
      </header>

      <Card glass>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Tabs
              value={filters.active ?? ALL}
              onValueChange={(value) =>
                setFilters((f) => ({
                  ...f,
                  active: value === ALL ? null : (value as StaffFilters['active']),
                }))
              }
            >
              <TabsList>
                <TabsTrigger value="true">{m.staff_status_active()}</TabsTrigger>
                <TabsTrigger value="false">{m.staff_status_inactive()}</TabsTrigger>
                <TabsTrigger value={ALL}>{m.staff_status_all()}</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-col gap-1.5 sm:w-48">
              <Label htmlFor={wardFilterId}>{m.staff_ward()}</Label>
              <Select
                id={wardFilterId}
                value={filters.wardNo === null ? ALL : String(filters.wardNo)}
                options={[
                  { value: ALL, label: m.staff_all_wards() },
                  ...StaffOptionsHelper.wards(wardCount),
                ]}
                placeholder={m.staff_all_wards()}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, wardNo: value === ALL ? null : Number(value) }))
                }
              />
            </div>
          </div>

          {error && <Alert>{ApiErrorHelper.message(error)}</Alert>}
          {isPending && <p className="py-8 text-center text-muted-foreground">{m.loading()}</p>}
          {staff?.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Users className="size-8" aria-hidden />
              <p>{m.staff_empty()}</p>
            </div>
          )}
          {staff && staff.length > 0 && (
            <ul className="divide-y divide-border">
              {staff.map((member) => (
                <StaffRow key={member.id} member={member} wardCount={wardCount} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
