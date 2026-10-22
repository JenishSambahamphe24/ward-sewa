import type { Request, Response } from 'express';
import type { ServiceTypesService } from './service-types.service.ts';

export class ServiceTypesController {
  readonly #serviceTypes: ServiceTypesService;

  constructor(serviceTypes: ServiceTypesService) {
    this.#serviceTypes = serviceTypes;
  }

  list = async (req: Request, res: Response) => {
    const { value, hit } = await this.#serviceTypes.listActive(req.query.localLevel);
    res.set('X-Cache', hit ? 'HIT' : 'MISS');
    res.json({ serviceTypes: value });
  };
}
