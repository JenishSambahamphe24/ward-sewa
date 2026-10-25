import { queryOptions } from '@tanstack/react-query';
import type { Application, ApplicationsPage, IssuedLetter } from '@/features/applications/types.ts';
import { ApiClient } from '@/lib/api-client.ts';
import type { QueueFilters, ReviewAction } from './types.ts';

export const QUEUE_KEY = ['staff-queue'] as const;
export const QUEUE_PAGE_SIZE = 20;

export const queueQuery = (filters: QueueFilters) =>
  queryOptions({
    queryKey: [...QUEUE_KEY, filters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: String(QUEUE_PAGE_SIZE),
      });
      if (filters.status) params.set('status', filters.status);
      return ApiClient.get<ApplicationsPage>(`/staff/applications?${params}`);
    },
  });

export const staffApplicationQuery = (id: number) =>
  queryOptions({
    queryKey: ['staff-applications', id],
    queryFn: async () =>
      (await ApiClient.get<{ application: Application }>(`/staff/applications/${id}`)).application,
  });

export class ReviewApi {
  static async transition(
    id: number,
    to: Exclude<ReviewAction, 'issue'>,
    version: number,
    note: string,
  ): Promise<Application> {
    const body = { to, version, ...(note ? { note } : {}) };
    return (
      await ApiClient.post<{ application: Application }>(`/staff/applications/${id}/transition`, {
        body,
      })
    ).application;
  }

  static async issue(id: number, version: number): Promise<IssuedLetter> {
    return (
      await ApiClient.post<{ letter: IssuedLetter }>(`/staff/applications/${id}/issue`, {
        body: { version },
      })
    ).letter;
  }
}
