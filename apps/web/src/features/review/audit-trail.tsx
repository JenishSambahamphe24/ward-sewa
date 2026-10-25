import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import type { Role } from '@/features/auth/session.ts';
import { cn } from '@/lib/cn.ts';
import { DateTimeHelper } from '@/lib/date-time.helper.ts';
import { LocaleHelper } from '@/lib/locale.helper.ts';
import { m } from '@/paraglide/messages.js';
import { auditQuery } from './queries.ts';
import type { AuditEvent } from './types.ts';

const EVENT_LABEL: Record<string, () => string> = {
  'application.created': m.audit_created,
  'application.submitted': m.audit_submitted,
  'application.under_review': m.audit_under_review,
  'application.needs_info': m.audit_needs_info,
  'application.rejected': m.audit_rejected,
  'application.approved': m.audit_approved,
  'application.issued': m.audit_issued,
  'letter.issued': m.audit_letter_issued,
};

const ROLE_LABEL: Record<Role, () => string> = {
  citizen: m.role_citizen,
  ward_secretary: m.role_ward_secretary,
  ward_chair: m.role_ward_chair,
  municipality_admin: m.role_municipality_admin,
};

function eventLabel(event: AuditEvent): string {
  return EVENT_LABEL[event.type]?.() ?? event.type;
}

function actor(event: AuditEvent): string {
  const role = ROLE_LABEL[event.actor.role as Role]?.() ?? event.actor.role;
  return m.audit_actor({ role, id: LocaleHelper.digits(event.actor.userId) });
}

interface AuditTrailProps {
  applicationId: number;
}

export function AuditTrail({ applicationId }: AuditTrailProps) {
  const { data: events = [], refetch, isFetching } = useQuery(auditQuery(applicationId));
  return (
    <Card glass>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <CardTitle>{m.audit_heading()}</CardTitle>
          <CardDescription>{m.audit_intro()}</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.audit_refresh()}
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={cn(isFetching && 'motion-safe:animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{m.audit_empty()}</p>
        ) : (
          <ol className="flex flex-col gap-3 text-sm">
            {events.map((event) => (
              <li key={event.id} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                <span className="font-medium">{eventLabel(event)}</span>
                <span className="text-muted-foreground">
                  {actor(event)} · {DateTimeHelper.bs(event.at)}
                </span>
                {event.note && <span className="italic">“{event.note}”</span>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
