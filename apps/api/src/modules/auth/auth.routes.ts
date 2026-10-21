import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { AuthController } from './auth.controller.ts';

export function authRouter(controller: AuthController, requireAuth: RequestHandler): Router {
  return Router()
    .post('/auth/otp/request', controller.requestOtp)
    .post('/auth/otp/verify', controller.verifyOtp)
    .get('/auth/me', requireAuth, controller.me)
    .post('/auth/logout', requireAuth, controller.logout);
}
