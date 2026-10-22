import { z } from 'zod';

// NTC, Ncell and Smart numbers: 10 digits starting 96, 97 or 98, stored without +977.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^9[678]\d{8}$/, 'Expected a Nepali mobile number');

export const localLevelCodeSchema = z.string().regex(/^NP\d{7}$/, 'Expected a code like NP0327101');

export const createMunicipalityAdminSchema = z.object({
  phone: phoneSchema,
  localLevelCode: localLevelCodeSchema,
  name: z.string().trim().min(1).max(100),
});

export const updateProfileSchema = z.object({ name: z.string().trim().min(1).max(100) });

export type CreateMunicipalityAdminInput = z.input<typeof createMunicipalityAdminSchema>;
