import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { AuthErrorHelper } from '@/features/auth/auth-error.helper.ts';
import { ROLE_HOME, meQuery } from '@/features/auth/session.ts';
import type { User } from '@/features/auth/session.ts';
import { ApiClient } from '@/lib/api-client.ts';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/_authed/profile')({ component: ProfilePage });

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const nameId = useId();
  const [name, setName] = useState(user.name ?? '');

  const save = useMutation({
    mutationFn: () => ApiClient.patch<{ user: User }>('/users/me', { body: { name } }),
    onSuccess: ({ user: updated }) => {
      queryClient.setQueryData(meQuery.queryKey, updated);
      void navigate({ to: ROLE_HOME[updated.role] });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-md">
      <Card stripe="accent">
        <CardHeader>
          <CardTitle className="text-xl">{m.profile_heading()}</CardTitle>
          <CardDescription>{m.profile_intro()}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={nameId}>{m.profile_name_label()}</Label>
              <Input
                id={nameId}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            {save.isError && <Alert>{AuthErrorHelper.message(save.error)}</Alert>}
            <Button type="submit" disabled={name.trim().length === 0 || save.isPending}>
              {m.profile_save()}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
