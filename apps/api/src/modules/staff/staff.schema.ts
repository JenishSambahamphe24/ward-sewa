import { z } from 'zod';
import { phoneSchema } from '../users/users.schema.ts';

const staffRole = z.enum(['ward_secretary', 'ward_chair']);
const wardNo = z.coerce.number().int().min(1).max(99);

export const listStaffQuerySchema = z.object({
  role: staffRole.optional(),
  wardNo: wardNo.optional(),
  active: z.enum(['true', 'false']).optional(),
});

export const assignStaffSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().min(1).max(100),
  role: staffRole,
  wardNo,
});

export const updateStaffSchema = z
  .object({ role: staffRole, wardNo, isActive: z.boolean() })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one of role, wardNo, isActive');

export const staffIdSchema = z.coerce.number().int().positive();

export type StaffRole = z.infer<typeof staffRole>;
export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;
