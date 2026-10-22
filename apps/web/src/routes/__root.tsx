import { Link, Outlet, createRootRoute } from '@tanstack/react-router';
import { LanguageSwitch } from '@/components/language-switch.tsx';
import { ThemeProvider } from '@/components/theme-provider.tsx';
import { ThemeSwitch } from '@/components/theme-switch.tsx';
import { m } from '@/paraglide/messages.js';

export const Route = createRootRoute({ component: RootLayout });

function RootLayout() {
  return (
    <ThemeProvider>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link to="/" className="text-lg font-semibold text-primary">
            {m.app_name()}
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitch />
            <LanguageSwitch />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-5xl border-t border-border px-4 py-6 text-sm text-muted-foreground">
        <Link to="/design" className="text-accent hover:underline">
          {m.nav_style_guide()}
        </Link>
      </footer>
    </ThemeProvider>
  );
}
