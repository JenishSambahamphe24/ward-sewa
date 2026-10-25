import { Link } from '@tanstack/react-router';
import { ChevronRight, Inbox } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge.tsx';
import type { Application } from '@/features/applications/types.ts';
import { DateTimeHelper } from '@/lib/date-time.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';

interface QueueListProps {
  items: readonly Application[];
}

export function QueueList({ items }: QueueListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <Inbox className="size-8" aria-hidden />
        <p>{m.queue_empty()}</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((application) => (
        <li key={application.id}>
          <Link
            to="/staff/applications/$applicationId"
            params={{ applicationId: application.id }}
            className="group flex items-center gap-4 rounded-md px-2 py-4 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {application.applicant.name ?? LocaleHelper.digits(application.applicant.phone)}
                </span>
                <StatusBadge status={application.status} />
              </div>
              <span className="truncate text-sm text-muted-foreground">
                {LocaleHelper.pick(application.serviceType.nameNe, application.serviceType.nameEn)}
                {' · '}
                <span className="font-mono">{application.trackingNo}</span>
              </span>
              {application.submittedAt && (
                <span className="text-xs text-muted-foreground">
                  {m.queue_submitted_at({ at: DateTimeHelper.bs(application.submittedAt) })}
                </span>
              )}
            </div>
            <ChevronRight
              className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
