import { z } from 'zod';

export const issueLetterSchema = z.object({ version: z.number().int().positive() });

export const verificationCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9A-HJKMNP-TV-Z]{10}$/, 'Expected a 10-character verification code');
