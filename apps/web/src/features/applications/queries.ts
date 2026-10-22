import { queryOptions } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client.ts';
import type { Application, NewApplication, ServiceType } from './types.ts';

export const serviceTypesQuery = (localLevelCode: string) =>
  queryOptions({
    queryKey: ['service-types', localLevelCode],
    queryFn: async () =>
      (
        await ApiClient.get<{ serviceTypes: ServiceType[] }>(
          `/service-types?localLevel=${encodeURIComponent(localLevelCode)}`,
        )
      ).serviceTypes,
    staleTime: 10 * 60_000,
  });

export class ApplicationsApi {
  static async create(input: NewApplication, idempotencyKey: string): Promise<Application> {
    const { application } = await ApiClient.post<{ application: Application }>('/applications', {
      body: input,
      idempotencyKey,
    });
    return application;
  }
}
