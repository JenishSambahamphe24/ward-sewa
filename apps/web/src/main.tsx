import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorPage } from '@/components/error-page.tsx';
import { NotFoundPage } from '@/components/not-found-page.tsx';
import { ApiClient } from '@/lib/api-client.ts';
import { getLocale } from '@/paraglide/runtime.js';
import { routeTree } from './routeTree.gen.ts';
import './styles/theme.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: ErrorPage,
});

ApiClient.onUnauthorized(() => {
  queryClient.clear();
  void router.navigate({ to: '/login', search: { redirect: router.state.location.href } });
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

document.documentElement.lang = getLocale();

// eslint-disable-next-line no-restricted-properties -- React needs its root before React exists.
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
