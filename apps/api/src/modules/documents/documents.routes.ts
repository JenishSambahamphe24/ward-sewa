import { Router } from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { MAX_DOCUMENT_BYTES } from '../../db/schema/index.ts';
import { requireRole } from '../../middleware/auth.ts';
import type { DocumentsController } from './documents.controller.ts';

// Held in memory: files are at most 5 MB and are hashed and type-checked before storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1, fields: 5 },
});

export function documentsRouter(
  controller: DocumentsController,
  requireAuth: RequestHandler,
): Router {
  const citizenOnly = [requireAuth, requireRole('citizen')];
  const applicantOrWardStaff = [
    requireAuth,
    requireRole('citizen', 'ward_secretary', 'ward_chair'),
  ];
  return Router()
    .post('/applications/:id/documents', citizenOnly, upload.single('file'), controller.upload)
    .get('/applications/:id/documents', applicantOrWardStaff, controller.list)
    .get('/applications/:id/documents/:documentId/file', applicantOrWardStaff, controller.download);
}
