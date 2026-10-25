import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { DateTimeHelper } from '@/lib/date-time.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import type { Application } from './types.ts';
import { EDITABLE_STATUSES } from './types.ts';

interface MyApplicationsListProps {
  items: readonly Application[];
}

export function MyApplicationsList({ items }: MyApplicationsListProps) {
  return (
    <ul className="divide-y divide-border">
      {items.map((application) => (
        <li key={application.id}>
          <Link
            to="/applications/$applicationId"
            params={{ applicationId: application.id }}
            className="group flex items-center gap-4 rounded-md px-2 py-4 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {LocaleHelper.pick(
                    application.serviceType.nameNe,
                    application.serviceType.nameEn,
                  )}
                </span>
                <StatusBadge status={application.status} />
                {EDITABLE_STATUSES.includes(application.status) && (
                  <Badge tone="highlight">{m.mine_your_turn()}</Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="font-mono">{application.trackingNo}</span>
                {' · '}
                {m.mine_created_at({ at: DateTimeHelper.bs(application.createdAt) })}
              </span>
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
