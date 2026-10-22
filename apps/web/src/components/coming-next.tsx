import { Card, CardDescription, CardHeader, CardTitle } from './ui/card.tsx';
import { m } from '@/paraglide/messages.js';

interface ComingNextProps {
  title: string;
}

export function ComingNext({ title }: ComingNextProps) {
  return (
    <Card stripe="highlight">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{m.coming_next()}</CardDescription>
      </CardHeader>
    </Card>
  );
}
