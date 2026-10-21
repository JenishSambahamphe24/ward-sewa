import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { UsersController } from './users.controller.ts';

export function usersRouter(controller: UsersController, requireAuth: RequestHandler): Router {
  return Router().patch('/users/me', requireAuth, controller.updateMe);
}
