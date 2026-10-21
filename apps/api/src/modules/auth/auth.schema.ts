import { z } from 'zod';
import { phoneSchema } from '../users/users.schema.ts';

export const requestOtpSchema = z.object({ phone: phoneSchema });

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, 'Expected a 6-digit code'),
});
