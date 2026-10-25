import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/components/status-badge.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { cn } from '@/lib/cn.ts';
import { DateTimeHelper } from '@/lib/date-time.helper.ts';
import { m } from '@/paraglide/messages.js';
import { historyQuery } from './queries.ts';

interface TimelineProps {
  applicationId: number;
}

export function Timeline({ applicationId }: TimelineProps) {
  const { data: history = [] } = useQuery(historyQuery(applicationId));
  return (
    <Card glass>
      <CardHeader>
        <CardTitle>{m.timeline_heading()}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-5 border-l-2 border-border pl-5">
          {history.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="relative flex flex-col gap-1">
              <span
                aria-hidden
                className={cn(
                  'absolute top-1.5 -left-[1.6rem] size-3 rounded-full ring-4 ring-surface',
                  {
                    'bg-primary': index === history.length - 1,
                    'bg-border': index !== history.length - 1,
                  },
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={entry.toStatus} />
                <span className="text-xs text-muted-foreground">{DateTimeHelper.bs(entry.at)}</span>
              </div>
              {entry.note && (
                <blockquote className="border-l-2 border-highlight pl-3 text-sm">
                  {entry.note}
                </blockquote>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
