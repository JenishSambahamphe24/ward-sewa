import { Link, useRouter } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { TriangleAlert } from 'lucide-react';
import { NotFoundPage } from '@/components/not-found-page.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ApiError } from '@/lib/api-client.ts';
import { m } from '@/paraglide/messages.js';

// The API answers 404 for anything that isn't yours too, so both read as "not found" here.
export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;

  const retry = () => {
    reset();
    void router.invalidate();
  };
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <TriangleAlert className="size-12 text-danger" aria-hidden />
      <h1 className="text-2xl font-bold tracking-tight">{m.error_heading()}</h1>
      <p className="text-muted-foreground">{m.error_body()}</p>
      <div className="flex gap-2">
        <Button onClick={retry}>{m.error_retry()}</Button>
        <Button variant="outline" asChild>
          <Link to="/">{m.error_home()}</Link>
        </Button>
      </div>
    </section>
  );
}
