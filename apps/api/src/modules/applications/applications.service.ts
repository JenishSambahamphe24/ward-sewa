import { AppError } from '../../lib/app-error.ts';
import type { WardsRepository } from '../divisions/wards.repository.ts';
import { FormDataHelper } from '../service-types/form-data.helper.ts';
import type { ServiceTypesRepository } from '../service-types/service-types.repository.ts';
import type { User } from '../users/users.repository.ts';
import { EDITABLE_STATUSES } from './applications.repository.ts';
import type { ApplicationsRepository, ApplicationView } from './applications.repository.ts';
import {
  applicationIdSchema,
  createApplicationSchema,
  listApplicationsQuerySchema,
  updateApplicationSchema,
} from './applications.schema.ts';

export interface ApplicationsServiceDeps {
  applications: ApplicationsRepository;
  serviceTypes: ServiceTypesRepository;
  wards: WardsRepository;
}

export class ApplicationsService {
  readonly #deps: ApplicationsServiceDeps;

  constructor(deps: ApplicationsServiceDeps) {
    this.#deps = deps;
  }

  async create(citizen: User, input: unknown): Promise<ApplicationView> {
    const data = createApplicationSchema.parse(input);
    const serviceType = await this.#deps.serviceTypes.findActive(data.serviceTypeId);
    if (serviceType?.localLevelCode !== data.localLevelCode) {
      throw new AppError(400, 'VALIDATION_FAILED', 'This service is not offered there');
    }
    const wardId = await this.#deps.wards.findId(data.localLevelCode, data.wardNo);
    if (wardId === null) {
      throw new AppError(400, 'VALIDATION_FAILED', `Ward ${data.wardNo} does not exist there`);
    }

    const formData = FormDataHelper.schema(serviceType.formFields, { complete: false }).parse(
      data.formData,
    );
    const id = await this.#deps.applications.create({
      citizenId: citizen.id,
      wardId,
      serviceTypeId: serviceType.id,
      tole: data.tole,
      houseNo: data.houseNo,
      formData,
    });
    return this.#mustFind(citizen, id);
  }

  async list(citizen: User, query: unknown) {
    const { page, limit } = listApplicationsQuerySchema.parse(query);
    const { items, total } = await this.#deps.applications.listForCitizen(citizen.id, {
      page,
      limit,
    });
    return { items, page, limit, total };
  }

  get(citizen: User, id: unknown): Promise<ApplicationView> {
    return this.#mustFind(citizen, applicationIdSchema.parse(id));
  }

  async update(citizen: User, id: unknown, input: unknown): Promise<ApplicationView> {
    const { version, formData, ...address } = updateApplicationSchema.parse(input);
    const current = await this.#mustFind(citizen, applicationIdSchema.parse(id));
    if (!EDITABLE_STATUSES.includes(current.status)) {
      throw new AppError(
        409,
        'CONFLICT',
        `An application that is ${current.status} can't be edited`,
      );
    }

    const serviceType = await this.#deps.serviceTypes.find(current.serviceType.id);
    const merged = formData
      ? FormDataHelper.schema(serviceType?.formFields ?? [], { complete: false }).parse({
          ...current.formData,
          ...formData,
        })
      : undefined;

    const saved = await this.#deps.applications.updateEditable(citizen.id, current.id, version, {
      ...address,
      formData: merged,
    });
    if (!saved) {
      throw new AppError(
        409,
        'CONFLICT',
        'This application changed since you loaded it; reload it',
      );
    }
    return this.#mustFind(citizen, current.id);
  }

  // Another citizen's application is a 404: its existence is not theirs to know.
  async #mustFind(citizen: User, id: number): Promise<ApplicationView> {
    const application = await this.#deps.applications.findForCitizen(citizen.id, id);
    if (!application) throw new AppError(404, 'NOT_FOUND', 'No such application');
    return application;
  }
}
