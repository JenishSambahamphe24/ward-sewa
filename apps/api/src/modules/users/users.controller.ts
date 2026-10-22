import type { Request, Response } from 'express';
import { RequestHelper } from '../../lib/request.helper.ts';
import { UserView } from './user.view.ts';
import type { UsersService } from './users.service.ts';

export class UsersController {
  readonly #users: UsersService;

  constructor(users: UsersService) {
    this.#users = users;
  }

  updateMe = async (req: Request, res: Response) => {
    const user = await this.#users.updateProfile(RequestHelper.user(req), req.body);
    res.json({ user: UserView.from(user) });
  };
}
