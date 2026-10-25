import type { ApplicationStatus } from '@/components/status-badge.tsx';

export type QueueStatus = Exclude<ApplicationStatus, 'draft'>;

export interface QueueFilters {
  status: QueueStatus | null;
  page: number;
}

export type ReviewAction = 'under_review' | 'needs_info' | 'rejected' | 'approved' | 'issue';
