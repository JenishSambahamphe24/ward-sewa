import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { User } from '../modules/users/users.repository.ts';
import { AppError } from '../lib/app-error.ts';
import type { AuthService } from '../modules/auth/auth.service.ts';

export function requireAuth(auth: AuthService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = /^Bearer (\S+)$/.exec(req.get('authorization') ?? '')?.[1];
    const user = token ? await auth.authenticate(token) : null;
    if (!token || !user) throw new AppError(401, 'UNAUTHENTICATED', 'Log in to continue');
    req.user = user;
    req.sessionToken = token;
    next();
  };
}

export function requireRole(...roles: User['role'][]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this action');
    }
    next();
  };
}
