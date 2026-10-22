import type { QueryClient } from '@tanstack/react-query';
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { AppHeader } from '@/components/app-header.tsx';
import { BrandBackdrop } from '@/components/brand-backdrop.tsx';
import { ThemeProvider } from '@/components/theme-provider.tsx';
import { m } from '@/paraglide/messages.js';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({ component: RootLayout });

function RootLayout() {
  return (
    <ThemeProvider>
      <BrandBackdrop />
      <AppHeader />
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
