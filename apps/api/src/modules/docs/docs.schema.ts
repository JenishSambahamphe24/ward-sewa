import { z } from 'zod';
import { applicationStatus } from '../../db/schema/applications.ts';
import { userRole } from '../../db/schema/users.ts';

// Response shapes for the OpenAPI document only; requests are documented from the real schemas.
const id = z.number().int().positive();
const timestamp = z.iso.datetime();
const status = z.enum(applicationStatus.enumValues);

export const errorResponse = z
  .object({
    error: z.object({
      code: z.enum([
        'NOT_FOUND',
        'VALIDATION_FAILED',
        'MALFORMED_JSON',
        'UNAUTHENTICATED',
        'FORBIDDEN',
        'CONFLICT',
        'IDEMPOTENCY_KEY_REUSED',
        'PAYLOAD_TOO_LARGE',
        'RATE_LIMITED',
        'INTERNAL_ERROR',
      ]),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .meta({ id: 'Error' });

export const userResponse = z
  .object({
    id,
    phone: z.string(),
    name: z.string().nullable(),
    role: z.enum(userRole.enumValues),
    wardId: id.nullable(),
    localLevelCode: z.string().nullable(),
  })
  .meta({ id: 'User' });

const serviceTypeSummary = z.object({
  id,
  code: z.string(),
  nameEn: z.string(),
  nameNe: z.string(),
  fee: z.string().meta({ example: '100.00', description: 'numeric(12,2) as a string' }),
});

export const serviceTypeResponse = serviceTypeSummary
  .extend({
    localLevelCode: z.string(),
    requiredDocuments: z.array(
      z.object({ code: z.string(), nameEn: z.string(), nameNe: z.string() }),
    ),
    formFields: z.array(
      z.object({
        key: z.string(),
        labelEn: z.string(),
        labelNe: z.string(),
        type: z.enum(['text', 'date_bs']),
        required: z.boolean(),
      }),
    ),
    isActive: z.boolean(),
  })
  .meta({ id: 'ServiceType' });

export const applicationResponse = z
  .object({
    id,
    trackingNo: z.string(),
    status,
    version: z
      .number()
      .int()
      .meta({ description: 'Send it back on every change (optimistic locking)' }),
    applicant: z.object({ id, name: z.string().nullable(), phone: z.string() }),
    serviceType: serviceTypeSummary,
    address: z.object({
      localLevelCode: z.string(),
      wardNo: z.number().int(),
      tole: z.string(),
      houseNo: z.string().nullable(),
    }),
    formData: z.record(z.string(), z.string()),
    createdAt: timestamp,
    updatedAt: timestamp,
    submittedAt: timestamp.nullable(),
  })
  .meta({ id: 'Application' });

export const applicationsPageResponse = z
  .object({
    items: z.array(applicationResponse),
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
  })
  .meta({ id: 'ApplicationsPage' });

export const historyEntryResponse = z
  .object({
    fromStatus: status.nullable(),
    toStatus: status,
    note: z.string().nullable(),
    at: timestamp,
  })
  .meta({ id: 'HistoryEntry' });

export const documentResponse = z
  .object({
    id,
    documentCode: z.string(),
    originalName: z.string(),
    mime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    sizeBytes: z.number().int(),
    sha256: z.string(),
    uploadedAt: timestamp,
  })
  .meta({ id: 'Document' });

export const letterResponse = z
  .looseObject({
    letterNo: z.string().meta({ example: '2083/84-0001' }),
    fiscalYear: z.string().meta({ example: '2083/84' }),
    issuedDateBs: z.string().meta({ example: '2083-07-05' }),
    issuedAt: timestamp,
    verificationCode: z.string().meta({ example: 'JVXWR6WF4T' }),
    pdfReady: z.boolean(),
  })
  .meta({
    id: 'Letter',
    description: 'Plus the frozen snapshot: applicant, serviceType, address, formData',
  });

export const verifiedLetterResponse = z
  .object({
    valid: z.literal(true),
    letterNo: z.string(),
    issuedDateBs: z.string(),
    applicantName: z.string(),
    serviceType: z.object({ code: z.string(), nameEn: z.string(), nameNe: z.string() }),
    issuedBy: z.object({ localLevel: z.string(), wardNo: z.number().int() }),
  })
  .meta({ id: 'VerifiedLetter' });

export const staffMemberResponse = z
  .object({
    id,
    phone: z.string(),
    name: z.string().nullable(),
    role: z.enum(['ward_secretary', 'ward_chair']),
    isActive: z.boolean(),
    ward: z.object({ id, wardNo: z.number().int() }),
  })
  .meta({ id: 'StaffMember' });

export const auditEventResponse = z
  .object({
    id,
    type: z.string().meta({ example: 'application.approved' }),
    actor: z.object({ userId: id, role: z.string() }),
    target: z.object({
      applicationId: id.optional(),
      letterId: id.optional(),
      userId: id.optional(),
    }),
    changes: z.record(z.string(), z.object({ from: z.unknown(), to: z.unknown() })).optional(),
    note: z.string().optional(),
    at: timestamp,
  })
  .meta({ id: 'AuditEvent' });

export const healthResponse = z
  .object({
    status: z.enum(['ok', 'degraded']),
    dateBs: z.string(),
    dependencies: z.record(
      z.string(),
      z.object({ status: z.enum(['up', 'down']), latencyMs: z.number().optional() }),
    ),
  })
  .meta({ id: 'Readiness' });
