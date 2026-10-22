import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  documentCode: z.string().trim().min(1).max(50),
});

export const documentIdSchema = z.coerce.number().int().positive();
