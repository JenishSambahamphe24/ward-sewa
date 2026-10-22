import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { LoginForm } from '@/features/auth/login-form.tsx';
import { RedirectHelper } from '@/features/auth/redirect.helper.ts';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { meQuery } from '@/features/auth/session.ts';
import type { User } from '@/features/auth/session.ts';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},
  beforeLoad: async ({ context, search }) => {
    const user = await RouteGuardHelper.currentUser(context.queryClient);
    if (user) throw redirect({ to: RedirectHelper.afterLogin(user.role, search.redirect) });
  },
  component: LoginPage,
});

function LoginPage() {
  const { redirect: requested } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const onLoggedIn = (user: User) => {
    queryClient.setQueryData(meQuery.queryKey, user);
    void navigate({ to: RedirectHelper.afterLogin(user.role, requested) });
  };

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] items-center justify-center py-10">
      <Card glass className="w-full max-w-sm">
        <CardHeader className="items-center gap-3 pt-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent text-primary-foreground shadow-lg">
            <ShieldCheck className="size-7" aria-hidden />
          </div>
          <CardTitle className="text-2xl">{m.login_heading()}</CardTitle>
          <CardDescription>{m.login_intro()}</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <LoginForm onLoggedIn={onLoggedIn} />
        </CardContent>
      </Card>
    </div>
  );
}
