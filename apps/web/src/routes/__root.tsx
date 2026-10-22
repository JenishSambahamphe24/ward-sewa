import { Outlet, createRootRoute } from '@tanstack/react-router';
import { LanguageSwitch } from '@/components/language-switch.tsx';
import { m } from '@/paraglide/messages.js';

export const Route = createRootRoute({ component: RootLayout });

function RootLayout() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-semibold text-primary">{m.app_name()}</span>
          <LanguageSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
