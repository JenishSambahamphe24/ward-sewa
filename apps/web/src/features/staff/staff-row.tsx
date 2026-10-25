import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, UserCheck, UserX } from 'lucide-react';
import { useId, useState } from 'react';
import { Alert } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Select } from '@/components/ui/select.tsx';
import { cn } from '@/lib/cn.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import { STAFF_KEY, StaffApi } from './queries.ts';
import { StaffErrorHelper } from './staff-error.helper.ts';
import { StaffOptionsHelper } from './staff-options.helper.ts';
import type { StaffChanges, StaffMember, StaffRole } from './types.ts';

interface StaffRowProps {
  member: StaffMember;
  wardCount: number;
}

export function StaffRow({ member, wardCount }: StaffRowProps) {
  const id = useId();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<'edit' | 'status' | null>(null);
  const [role, setRole] = useState<string>(member.role);
  const [wardNo, setWardNo] = useState(String(member.ward.wardNo));
  const name = member.name ?? m.staff_unnamed();

  const update = useMutation({
    mutationFn: (changes: StaffChanges) => StaffApi.update(member.id, changes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      setDialog(null);
    },
  });

  const openDialog = (next: 'edit' | 'status') => {
    setRole(member.role);
    setWardNo(String(member.ward.wardNo));
    update.reset();
    setDialog(next);
  };
  // Send only what changed, so the audit log records exactly what the admin did.
  const saveEdit = () => {
    const changes: StaffChanges = {};
    if (role !== member.role) changes.role = role as StaffRole;
    if (Number(wardNo) !== member.ward.wardNo) changes.wardNo = Number(wardNo);
    if (Object.keys(changes).length === 0) setDialog(null);
    else update.mutate(changes);
  };
  const error = update.isError ? StaffErrorHelper.message(update.error, Number(wardNo)) : null;

  return (
    <li
      className={cn('flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between', {
        'opacity-60': !member.isActive,
      })}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{name}</span>
          <Badge tone={member.role === 'ward_chair' ? 'primary' : 'accent'}>
            {StaffOptionsHelper.roleLabel(member.role)}
          </Badge>
          {!member.isActive && <Badge tone="outline">{m.staff_status_inactive()}</Badge>}
        </div>
        <span className="text-sm text-muted-foreground">
          {m.staff_ward_n({ ward: LocaleHelper.digits(member.ward.wardNo) })}
          {' · '}
          <span className="font-mono">{LocaleHelper.digits(member.phone)}</span>
        </span>
      </div>
      <div className="flex gap-2">
        {member.isActive && (
          <Button variant="outline" size="sm" onClick={() => openDialog('edit')}>
            <Pencil />
            {m.staff_edit()}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => openDialog('status')}>
          {member.isActive ? <UserX /> : <UserCheck />}
          {member.isActive ? m.staff_deactivate() : m.staff_reactivate()}
        </Button>
      </div>

      <Dialog open={dialog === 'edit'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent closeLabel={m.action_close()}>
          <DialogTitle>{m.staff_edit_title({ name })}</DialogTitle>
          <DialogDescription>{m.staff_edit_intro()}</DialogDescription>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-role`}>{m.staff_role()}</Label>
              <Select
                id={`${id}-role`}
                value={role}
                options={StaffOptionsHelper.roles()}
                placeholder={m.address_choose()}
                onValueChange={setRole}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-ward`}>{m.staff_ward()}</Label>
              <Select
                id={`${id}-ward`}
                value={wardNo}
                options={StaffOptionsHelper.wards(wardCount)}
                placeholder={m.address_choose()}
                onValueChange={setWardNo}
              />
            </div>
          </div>
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(null)}>
              {m.action_cancel()}
            </Button>
            <Button onClick={saveEdit} disabled={update.isPending}>
              {m.profile_save()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'status'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent closeLabel={m.action_close()}>
          <DialogTitle>
            {member.isActive
              ? m.staff_deactivate_title({ name })
              : m.staff_reactivate_title({ name })}
          </DialogTitle>
          <DialogDescription>
            {member.isActive ? m.staff_deactivate_body() : m.staff_reactivate_body()}
          </DialogDescription>
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(null)}>
              {m.action_cancel()}
            </Button>
            <Button
              variant={member.isActive ? 'danger' : 'accent'}
              onClick={() => update.mutate({ isActive: !member.isActive })}
              disabled={update.isPending}
            >
              {member.isActive ? m.staff_deactivate() : m.staff_reactivate()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}
