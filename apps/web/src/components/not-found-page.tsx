import { Link } from '@tanstack/react-router';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { m } from '@/paraglide/messages.js';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <Compass className="size-12 text-highlight" aria-hidden />
      <p className="font-mono text-sm font-semibold tracking-widest text-muted-foreground">404</p>
      <h1 className="text-2xl font-bold tracking-tight">{m.not_found_heading()}</h1>
      <p className="text-muted-foreground">{m.not_found_body()}</p>
      <Button asChild>
        <Link to="/">{m.error_home()}</Link>
      </Button>
    </section>
  );
}
