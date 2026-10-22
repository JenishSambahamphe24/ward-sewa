import { m } from '@/paraglide/messages.js';
import { Badge } from './ui/badge.tsx';

export type ApplicationStatus =
  'draft' | 'submitted' | 'under_review' | 'needs_info' | 'approved' | 'rejected' | 'issued';

// Every status maps onto the three brand colours; no extra hues for states.
const STATUS = {
  draft: { tone: 'muted', label: m.status_draft },
  submitted: { tone: 'outline', label: m.status_submitted },
  under_review: { tone: 'highlight', label: m.status_under_review },
  needs_info: { tone: 'highlight', label: m.status_needs_info },
  approved: { tone: 'accent', label: m.status_approved },
  rejected: { tone: 'primary', label: m.status_rejected },
  issued: { tone: 'accent', label: m.status_issued },
} as const;

interface StatusBadgeProps {
  status: ApplicationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { tone, label } = STATUS[status];
  return <Badge tone={tone}>{label()}</Badge>;
}
