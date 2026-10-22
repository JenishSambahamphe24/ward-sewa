import { Router } from 'express';
import type { RequestHandler } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import type { ApplicationsController } from './applications.controller.ts';

export function applicationsRouter(
  controller: ApplicationsController,
  requireAuth: RequestHandler,
  idempotent: RequestHandler,
): Router {
  const citizenOnly = [requireAuth, requireRole('citizen')];
  return Router()
    .post('/applications', citizenOnly, idempotent, controller.create)
    .get('/applications', citizenOnly, controller.list)
    .get('/applications/:id', citizenOnly, controller.get)
    .patch('/applications/:id', citizenOnly, controller.update)
    .post('/applications/:id/submit', citizenOnly, controller.submit)
    .get(
      '/applications/:id/history',
      requireAuth,
      requireRole('citizen', 'ward_secretary', 'ward_chair'),
      controller.history,
    );
}
