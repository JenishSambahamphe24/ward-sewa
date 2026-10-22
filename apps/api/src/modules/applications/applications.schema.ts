import { z } from 'zod';
import { localLevelCodeSchema } from '../users/users.schema.ts';

const address = {
  tole: z.string().trim().min(1).max(100),
  houseNo: z.string().trim().min(1).max(20).optional(),
};

export const createApplicationSchema = z.object({
  serviceTypeId: z.number().int().positive(),
  localLevelCode: localLevelCodeSchema,
  wardNo: z.number().int().min(1).max(99),
  ...address,
  formData: z.record(z.string(), z.unknown()).default({}),
});

export const updateApplicationSchema = z
  .object({
    version: z.number().int().positive(),
    ...address,
    formData: z.record(z.string(), z.unknown()),
  })
  .partial({ tole: true, houseNo: true, formData: true })
  .refine(({ version: _, ...changes }) => Object.keys(changes).length > 0, {
    message: 'Send at least one of tole, houseNo, formData',
  });

export const submitApplicationSchema = z.object({ version: z.number().int().positive() });

export const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const wardQueueQuerySchema = listApplicationsQuerySchema.extend({
  status: z
    .enum(['submitted', 'under_review', 'needs_info', 'approved', 'rejected', 'issued'])
    .optional(),
  serviceTypeId: z.coerce.number().int().positive().optional(),
});

export const transitionSchema = z.object({
  to: z.enum(['under_review', 'needs_info', 'rejected', 'approved']),
  version: z.number().int().positive(),
  note: z.string().trim().min(1).max(500).optional(),
});

export const applicationIdSchema = z.coerce.number().int().positive();

export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
export type WardQueueQuery = z.infer<typeof wardQueueQuerySchema>;
