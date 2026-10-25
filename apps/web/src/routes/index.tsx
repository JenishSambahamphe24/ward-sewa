import { Link, createFileRoute, redirect } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { RouteGuardHelper } from '@/features/auth/route-guard.helper.ts';
import { ROLE_HOME } from '@/features/auth/session.ts';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const user = await RouteGuardHelper.currentUser(context.queryClient);
    if (user) throw redirect({ to: ROLE_HOME[user.role] });
  },
  component: Home,
});

function Home() {
  return (
    <section className="flex flex-col items-start gap-4 py-12">
      <p className="text-sm font-medium text-accent">{m.app_tagline()}</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{m.home_heading()}</h1>
      <p className="max-w-xl text-muted-foreground">{m.home_body()}</p>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" asChild>
          <Link to="/login">{m.home_cta()}</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link to="/verify">{m.nav_verify()}</Link>
        </Button>
      </div>
    </section>
  );
}
