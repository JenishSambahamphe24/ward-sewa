import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { ROLE_HOME, meQuery } from '@/features/auth/session.ts';
import type { Role } from '@/features/auth/session.ts';
import { ApiClient } from '@/lib/api-client.ts';
import { m } from '@/paraglide/messages.js';
import { LanguageSwitch } from './language-switch.tsx';
import { ThemeSwitch } from './theme-switch.tsx';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';

const NAV = {
  citizen: [
    { to: '/applications', label: m.nav_my_applications },
    { to: '/applications/new', label: m.nav_new_application },
  ],
  ward_secretary: [{ to: '/staff', label: m.nav_queue }],
  ward_chair: [{ to: '/staff', label: m.nav_queue }],
  municipality_admin: [{ to: '/admin', label: m.nav_staff }],
} as const;

const ROLE_LABEL = {
  citizen: m.role_citizen,
  ward_secretary: m.role_ward_secretary,
  ward_chair: m.role_ward_chair,
  municipality_admin: m.role_municipality_admin,
} as const satisfies Record<Role, () => string>;

export function AppHeader() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: user } = useQuery({ ...meQuery, enabled: ApiClient.token() !== null });

  const logout = useMutation({
    mutationFn: () => ApiClient.post('/auth/logout'),
    onSettled: () => {
      ApiClient.setToken(null);
      queryClient.clear();
      void navigate({ to: '/login' });
    },
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
        <div className="flex items-center gap-6">
          <Link
            to={user ? ROLE_HOME[user.role] : '/'}
            className="text-lg font-semibold text-primary"
          >
            {m.app_name()}
          </Link>
          {user && (
            <nav className="flex gap-4 text-sm">
              {NAV[user.role].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: true }}
                  className="text-muted-foreground hover:text-foreground data-[status=active]:font-medium data-[status=active]:text-primary"
                >
                  {item.label()}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden items-center gap-2 text-sm sm:flex">
              {user.name ?? user.phone}
              <Badge tone="outline">{ROLE_LABEL[user.role]()}</Badge>
            </span>
          )}
          <ThemeSwitch />
          <LanguageSwitch />
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut />
              {m.nav_logout()}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
