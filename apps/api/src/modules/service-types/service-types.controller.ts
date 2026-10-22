import type { Request, Response } from 'express';
import { localLevelCodeSchema } from '../users/users.schema.ts';
import type { ServiceTypesRepository } from './service-types.repository.ts';

export class ServiceTypesController {
  readonly #serviceTypes: ServiceTypesRepository;

  constructor(serviceTypes: ServiceTypesRepository) {
    this.#serviceTypes = serviceTypes;
  }

  list = async (req: Request, res: Response) => {
    const localLevelCode = localLevelCodeSchema.parse(req.query.localLevel);
    const rows = await this.#serviceTypes.listActive(localLevelCode);
    res.json({
      serviceTypes: rows.map(
        ({ id, code, nameEn, nameNe, fee, requiredDocuments, formFields }) => ({
          id,
          code,
          nameEn,
          nameNe,
          fee,
          requiredDocuments,
          formFields,
        }),
      ),
    });
  };
}
