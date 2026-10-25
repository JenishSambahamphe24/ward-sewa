import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { NewApplicationForm } from '@/features/applications/new-application-form.tsx';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/_authed/applications/new')({
  beforeLoad: ({ context }) => RouteGuardHelper.requireRoles(context.user, ['citizen']),
  component: NewApplicationPage,
});

function NewApplicationPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{m.apply_heading()}</h1>
        <p className="text-muted-foreground">{m.apply_intro()}</p>
      </header>
      <NewApplicationForm
        onCreated={(application) =>
          void navigate({
            to: '/applications/$applicationId',
            params: { applicationId: application.id },
          })
        }
      />
    </div>
  );
}
