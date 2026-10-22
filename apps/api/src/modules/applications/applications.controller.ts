import type { Request, Response } from 'express';
import { RequestHelper } from '../../lib/request.helper.ts';
import type { ApplicationsService } from './applications.service.ts';

export class ApplicationsController {
  readonly #applications: ApplicationsService;

  constructor(applications: ApplicationsService) {
    this.#applications = applications;
  }

  create = async (req: Request, res: Response) => {
    const application = await this.#applications.create(RequestHelper.user(req), req.body);
    res.status(201).json({ application });
  };

  list = async (req: Request, res: Response) => {
    res.json(await this.#applications.list(RequestHelper.user(req), req.query));
  };

  get = async (req: Request, res: Response) => {
    res.json({ application: await this.#applications.get(RequestHelper.user(req), req.params.id) });
  };

  update = async (req: Request, res: Response) => {
    const user = RequestHelper.user(req);
    res.json({ application: await this.#applications.update(user, req.params.id, req.body) });
  };

  submit = async (req: Request, res: Response) => {
    const user = RequestHelper.user(req);
    res.json({ application: await this.#applications.submit(user, req.params.id, req.body) });
  };

  history = async (req: Request, res: Response) => {
    res.json({ history: await this.#applications.history(RequestHelper.user(req), req.params.id) });
  };
}
