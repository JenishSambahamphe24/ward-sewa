import { AppError } from '../../lib/app-error.ts';
import type { WardsRepository } from '../divisions/wards.repository.ts';
import type { DocumentsRepository } from '../documents/documents.repository.ts';
import { FormDataHelper } from '../service-types/form-data.helper.ts';
import type { ServiceTypesRepository } from '../service-types/service-types.repository.ts';
import type { User } from '../users/users.repository.ts';
import { EDITABLE_STATUSES } from './applications.repository.ts';
import type { ApplicationsRepository, ApplicationView } from './applications.repository.ts';
import {
  applicationIdSchema,
  createApplicationSchema,
  listApplicationsQuerySchema,
  submitApplicationSchema,
  updateApplicationSchema,
} from './applications.schema.ts';

export interface ApplicationsServiceDeps {
  applications: ApplicationsRepository;
  serviceTypes: ServiceTypesRepository;
  wards: WardsRepository;
  documents: DocumentsRepository;
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

  async submit(citizen: User, id: unknown, input: unknown): Promise<ApplicationView> {
    const { version } = submitApplicationSchema.parse(input);
    const current = await this.#mustFind(citizen, applicationIdSchema.parse(id));
    if (!EDITABLE_STATUSES.includes(current.status)) {
      throw new AppError(
        409,
        'CONFLICT',
        `An application that is ${current.status} can't be submitted`,
      );
    }
    if (!citizen.name) {
      throw new AppError(400, 'VALIDATION_FAILED', 'Set your full name before submitting');
    }

    const serviceType = await this.#deps.serviceTypes.find(current.serviceType.id);
    const form = FormDataHelper.schema(serviceType?.formFields ?? [], { complete: true }).safeParse(
      current.formData,
    );
    if (!form.success) {
      throw new AppError(400, 'VALIDATION_FAILED', 'Fill in every required field', {
        details: form.error.issues,
      });
    }
    const uploaded = new Set(
      (await this.#deps.documents.list(current.id)).map((d) => d.documentCode),
    );
    const missingDocuments = (serviceType?.requiredDocuments ?? [])
      .filter((d) => !uploaded.has(d.code))
      .map((d) => d.code);
    if (missingDocuments.length > 0) {
      throw new AppError(400, 'VALIDATION_FAILED', 'Upload every required document', {
        details: { missingDocuments },
      });
    }

    const submitted = await this.#deps.applications.transition({
      applicationId: current.id,
      version,
      from: current.status,
      to: 'submitted',
      actorId: citizen.id,
    });
    if (!submitted) {
      throw new AppError(
        409,
        'CONFLICT',
        'This application changed since you loaded it; reload it',
      );
    }
    return this.#mustFind(citizen, current.id);
  }

  async history(citizen: User, id: unknown) {
    const application = await this.#mustFind(citizen, applicationIdSchema.parse(id));
    return this.#deps.applications.history(application.id);
  }

  // Another citizen's application is a 404: its existence is not theirs to know.
  async #mustFind(citizen: User, id: number): Promise<ApplicationView> {
    const application = await this.#deps.applications.findForCitizen(citizen.id, id);
    if (!application) throw new AppError(404, 'NOT_FOUND', 'No such application');
    return application;
  }
}
