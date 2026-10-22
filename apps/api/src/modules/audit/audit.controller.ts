import type { Request, Response } from 'express';
import { RequestHelper } from '../../lib/request.helper.ts';
import type { AuditService } from './audit.service.ts';

export class AuditController {
  readonly #audit: AuditService;

  constructor(audit: AuditService) {
    this.#audit = audit;
  }

  forApplication = async (req: Request, res: Response) => {
    const events = await this.#audit.forApplication(RequestHelper.user(req), req.params.id);
    res.json({ events: events.map(({ _id, ...event }) => ({ id: _id, ...event })) });
  };
}
