import { Router } from 'express';
import type { RequestHandler } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import type { ReviewController } from './review.controller.ts';

export function reviewRouter(controller: ReviewController, requireAuth: RequestHandler): Router {
  const wardStaff = [requireAuth, requireRole('ward_secretary', 'ward_chair')];
  return Router()
    .get('/staff/applications', wardStaff, controller.queue)
    .get('/staff/applications/:id', wardStaff, controller.get)
    .post('/staff/applications/:id/transition', wardStaff, controller.transition);
}
