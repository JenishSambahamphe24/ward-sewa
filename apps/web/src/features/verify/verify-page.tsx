import type { ReactNode } from 'react';
import { m } from '@/paraglide/messages.js';

interface VerifyPageProps {
  children: ReactNode;
}

export function VerifyPage({ children }: VerifyPageProps) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">{m.verify_heading()}</h1>
        <p className="text-muted-foreground">{m.verify_intro()}</p>
      </header>
      {children}
    </div>
  );
}
