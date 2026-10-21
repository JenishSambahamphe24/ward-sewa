import type { Request, Response } from 'express';
import { RequestHelper } from '../../lib/request.helper.ts';
import { UserView } from '../users/user.view.ts';
import type { AuthService } from './auth.service.ts';

export class AuthController {
  readonly #auth: AuthService;

  constructor(auth: AuthService) {
    this.#auth = auth;
  }

  requestOtp = async (req: Request, res: Response) => {
    res.status(202).json(await this.#auth.requestOtp(req.body));
  };

  verifyOtp = async (req: Request, res: Response) => {
    const { token, user } = await this.#auth.verifyOtp(req.body);
    res.json({ token, user: UserView.from(user) });
  };

  me = (req: Request, res: Response) => {
    res.json({ user: UserView.from(RequestHelper.user(req)) });
  };

  logout = async (req: Request, res: Response) => {
    if (req.sessionToken) await this.#auth.logout(req.sessionToken);
    res.sendStatus(204);
  };
}
