import { queryOptions } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client.ts';

export interface VerifiedLetter {
  valid: true;
  letterNo: string;
  issuedDateBs: string;
  applicantName: string;
  serviceType: { code: string; nameEn: string; nameNe: string };
  issuedBy: { localLevel: string; wardNo: number };
}

export const verifyQuery = (code: string) =>
  queryOptions({
    queryKey: ['verify', code],
    queryFn: () => ApiClient.get<VerifiedLetter>(`/verify/${encodeURIComponent(code)}`),
    // A 404 is an answer ("not genuine"), not a glitch worth retrying.
    retry: false,
    staleTime: Infinity,
  });
