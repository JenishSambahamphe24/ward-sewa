import type { Request, Response } from 'express';
import { RequestHelper } from '../../lib/request.helper.ts';
import type { StaffService } from './staff.service.ts';

export class StaffController {
  readonly #staff: StaffService;

  constructor(staff: StaffService) {
    this.#staff = staff;
  }

  list = async (req: Request, res: Response) => {
    res.json({ staff: await this.#staff.list(RequestHelper.user(req), req.query) });
  };

  assign = async (req: Request, res: Response) => {
    const admin = RequestHelper.user(req);
    const member = await this.#staff.assign(admin, req.body);
    req.log.info({ actorId: admin.id, staffId: member.id, role: member.role }, 'staff assigned');
    res.status(201).json({ staff: member });
  };

  update = async (req: Request, res: Response) => {
    const admin = RequestHelper.user(req);
    const member = await this.#staff.update(admin, req.params.id, req.body);
    req.log.info({ actorId: admin.id, staffId: member.id, changes: req.body }, 'staff updated');
    res.json({ staff: member });
  };
}
