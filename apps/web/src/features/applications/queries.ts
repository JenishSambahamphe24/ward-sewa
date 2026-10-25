import { queryOptions } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client.ts';
import type {
  Application,
  ApplicationDocument,
  HistoryEntry,
  IssuedLetter,
  NewApplication,
  ServiceType,
} from './types.ts';

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

export const applicationQuery = (id: number) =>
  queryOptions({
    queryKey: ['applications', id],
    queryFn: async () =>
      (await ApiClient.get<{ application: Application }>(`/applications/${id}`)).application,
  });

export const documentsQuery = (id: number) =>
  queryOptions({
    queryKey: ['applications', id, 'documents'],
    queryFn: async () =>
      (await ApiClient.get<{ documents: ApplicationDocument[] }>(`/applications/${id}/documents`))
        .documents,
  });

export const historyQuery = (id: number) =>
  queryOptions({
    queryKey: ['applications', id, 'history'],
    queryFn: async () =>
      (await ApiClient.get<{ history: HistoryEntry[] }>(`/applications/${id}/history`)).history,
  });

// Polls every 3 s until the worker has attached the PDF, then stops.
export const letterQuery = (id: number) =>
  queryOptions({
    queryKey: ['applications', id, 'letter'],
    queryFn: async () =>
      (await ApiClient.get<{ letter: IssuedLetter }>(`/applications/${id}/letter`)).letter,
    refetchInterval: (query) => (query.state.data?.pdfReady === false ? 3000 : false),
  });

export class ApplicationsApi {
  static async create(input: NewApplication, idempotencyKey: string): Promise<Application> {
    const { application } = await ApiClient.post<{ application: Application }>('/applications', {
      body: input,
      idempotencyKey,
    });
    return application;
  }

  static async update(
    id: number,
    changes: {
      version: number;
      tole?: string;
      houseNo?: string;
      formData?: Record<string, string>;
    },
  ): Promise<Application> {
    return (
      await ApiClient.patch<{ application: Application }>(`/applications/${id}`, { body: changes })
    ).application;
  }

  static async submit(id: number, version: number): Promise<Application> {
    return (
      await ApiClient.post<{ application: Application }>(`/applications/${id}/submit`, {
        body: { version },
      })
    ).application;
  }

  static async uploadDocument(id: number, documentCode: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('documentCode', documentCode);
    formData.append('file', file);
    await ApiClient.upload(`/applications/${id}/documents`, formData);
  }

  static documentFile(id: number, documentId: number): Promise<Blob> {
    return ApiClient.blob(`/applications/${id}/documents/${documentId}/file`);
  }

  static letterPdf(id: number): Promise<Blob> {
    return ApiClient.blob(`/applications/${id}/letter/pdf`);
  }
}
