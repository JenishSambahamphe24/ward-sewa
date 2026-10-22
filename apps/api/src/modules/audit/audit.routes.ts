import { Router } from 'express';
import type { RequestHandler } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import type { AuditController } from './audit.controller.ts';

export function auditRouter(controller: AuditController, requireAuth: RequestHandler): Router {
  return Router().get(
    '/applications/:id/audit',
    requireAuth,
    requireRole('citizen', 'ward_secretary', 'ward_chair'),
    controller.forApplication,
  );
}
