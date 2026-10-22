import type { ApplicationStatus } from '@/components/status-badge.tsx';

export interface FormField {
  key: string;
  labelEn: string;
  labelNe: string;
  type: 'text' | 'date_bs';
  required: boolean;
}

export interface RequiredDocument {
  code: string;
  nameEn: string;
  nameNe: string;
}

export interface ServiceType {
  id: number;
  code: string;
  nameEn: string;
  nameNe: string;
  fee: string;
  requiredDocuments: RequiredDocument[];
  formFields: FormField[];
}

export interface Application {
  id: number;
  trackingNo: string;
  status: ApplicationStatus;
  version: number;
  applicant: { id: number; name: string | null; phone: string };
  serviceType: { id: number; code: string; nameEn: string; nameNe: string; fee: string };
  address: { localLevelCode: string; wardNo: number; tole: string; houseNo: string | null };
  formData: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

export interface NewApplication {
  serviceTypeId: number;
  localLevelCode: string;
  wardNo: number;
  tole: string;
  houseNo?: string;
  formData: Record<string, string>;
}
