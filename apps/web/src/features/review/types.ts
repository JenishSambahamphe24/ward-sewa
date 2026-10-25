import type { ApplicationStatus } from '@/components/status-badge.tsx';
import type { Application } from '@/features/applications/types.ts';

export type QueueStatus = Exclude<ApplicationStatus, 'draft'>;

export interface QueueFilters {
  status: QueueStatus | null;
  page: number;
}

export interface QueuePage {
  items: Application[];
  page: number;
  limit: number;
  total: number;
}

export type ReviewAction = 'under_review' | 'needs_info' | 'rejected' | 'approved' | 'issue';
