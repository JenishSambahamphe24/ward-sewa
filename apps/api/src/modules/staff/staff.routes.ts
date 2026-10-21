import { Router } from 'express';
import type { RequestHandler } from 'express';
import { requireRole } from '../../middleware/auth.ts';
import type { StaffController } from './staff.controller.ts';

export function staffRouter(controller: StaffController, requireAuth: RequestHandler): Router {
  const adminOnly = [requireAuth, requireRole('municipality_admin')];
  return Router()
    .get('/admin/staff', adminOnly, controller.list)
    .post('/admin/staff', adminOnly, controller.assign)
    .patch('/admin/staff/:id', adminOnly, controller.update);
}
