import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Select } from '@/components/ui/select.tsx';
import { PhoneHelper } from '@/lib/phone.helper.ts';
import { m } from '@/paraglide/messages.js';
import { STAFF_KEY, StaffApi } from './queries.ts';
import { StaffErrorHelper } from './staff-error.helper.ts';
import { StaffOptionsHelper } from './staff-options.helper.ts';
import type { StaffRole } from './types.ts';

const EMPTY = { name: '', phone: '', role: '', wardNo: '' };

interface AssignStaffDialogProps {
  wardCount: number;
}

export function AssignStaffDialog({ wardCount }: AssignStaffDialogProps) {
  const id = useId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const phone = PhoneHelper.normalize(form.phone);
  const phoneInvalid = form.phone !== '' && !PhoneHelper.isValid(phone);
  const ready =
    form.name.trim() !== '' && PhoneHelper.isValid(phone) && form.role !== '' && form.wardNo !== '';

  const assign = useMutation({
    mutationFn: () =>
      StaffApi.assign({
        name: form.name.trim(),
        phone,
        role: form.role as StaffRole,
        wardNo: Number(form.wardNo),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      setOpen(false);
    },
  });

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) {
      setForm(EMPTY);
      assign.reset();
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) assign.mutate();
  };
  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          {m.staff_assign()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogTitle>{m.staff_assign()}</DialogTitle>
        <DialogDescription>{m.staff_assign_intro()}</DialogDescription>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-name`}>{m.staff_name()}</Label>
            <Input
              id={`${id}-name`}
              value={form.name}
              onChange={(event) => set('name')(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-phone`}>{m.staff_phone()}</Label>
            <Input
              id={`${id}-phone`}
              inputMode="tel"
              value={form.phone}
              aria-invalid={phoneInvalid}
              onChange={(event) => set('phone')(event.target.value)}
            />
            {phoneInvalid && <p className="text-sm text-danger">{m.login_phone_invalid()}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-role`}>{m.staff_role()}</Label>
              <Select
                id={`${id}-role`}
                value={form.role}
                options={StaffOptionsHelper.roles()}
                placeholder={m.address_choose()}
                onValueChange={set('role')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-ward`}>{m.staff_ward()}</Label>
              <Select
                id={`${id}-ward`}
                value={form.wardNo}
                options={StaffOptionsHelper.wards(wardCount)}
                placeholder={m.address_choose()}
                onValueChange={set('wardNo')}
              />
            </div>
          </div>
          {assign.isError && (
            <Alert>{StaffErrorHelper.message(assign.error, Number(form.wardNo))}</Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {m.action_cancel()}
            </Button>
            <Button type="submit" disabled={!ready || assign.isPending}>
              {m.staff_assign_submit()}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
