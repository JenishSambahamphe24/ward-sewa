import type { User } from '../modules/users/users.repository.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}
