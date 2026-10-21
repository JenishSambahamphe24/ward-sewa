import type { Request } from 'express';
import type { User } from '../modules/users/users.repository.ts';
import { AppError } from './app-error.ts';

export class RequestHelper {
  /** For routes behind requireAuth; throws if it was left off. */
  static user(req: Request): User {
    if (!req.user) throw new AppError(401, 'UNAUTHENTICATED', 'Log in to continue');
    return req.user;
  }
}
