import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { m } from '@/paraglide/messages.js';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <section className="flex flex-col items-start gap-4 py-12">
      <p className="text-sm font-medium text-accent">{m.app_tagline()}</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{m.home_heading()}</h1>
      <p className="max-w-xl text-muted-foreground">{m.home_body()}</p>
      <Button size="lg">{m.home_cta()}</Button>
    </section>
  );
}
