import { Router } from 'express';
import type { RequestHandler } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import type { LettersController } from './letters.controller.ts';

export function lettersRouter(controller: LettersController, requireAuth: RequestHandler): Router {
  return Router()
    .post(
      '/staff/applications/:id/issue',
      requireAuth,
      requireRole('ward_secretary', 'ward_chair'),
      controller.issue,
    )
    .get(
      '/applications/:id/letter',
      requireAuth,
      requireRole('citizen', 'ward_secretary', 'ward_chair'),
      controller.forApplication,
    )
    .get('/verify/:code', controller.verify);
}
