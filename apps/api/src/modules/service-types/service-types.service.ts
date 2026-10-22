import type { Cached, RedisCache } from '../../lib/cache.ts';
import { localLevelCodeSchema } from '../users/users.schema.ts';
import type { ServiceType, ServiceTypesRepository } from './service-types.repository.ts';

export const SERVICE_TYPES_TTL_SECONDS = 600;

// Bump the version when the cached shape changes, so old entries are ignored, not misread.
const cacheKey = (localLevelCode: string) => `cache:service-types:v1:${localLevelCode}`;

export type ServiceTypeView = Pick<
  ServiceType,
  'id' | 'code' | 'nameEn' | 'nameNe' | 'fee' | 'requiredDocuments' | 'formFields'
>;

export interface ServiceTypesServiceDeps {
  serviceTypes: ServiceTypesRepository;
  cache: RedisCache;
}

export class ServiceTypesService {
  readonly #deps: ServiceTypesServiceDeps;

  constructor(deps: ServiceTypesServiceDeps) {
    this.#deps = deps;
  }

  listActive(localLevel: unknown): Promise<Cached<ServiceTypeView[]>> {
    const localLevelCode = localLevelCodeSchema.parse(localLevel);
    return this.#deps.cache.getOrLoad(
      cacheKey(localLevelCode),
      SERVICE_TYPES_TTL_SECONDS,
      async () =>
        (await this.#deps.serviceTypes.listActive(localLevelCode)).map(
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
    );
  }

  // Call after changing a municipality's service types (the future admin editor).
  invalidate(localLevelCode: string): Promise<void> {
    return this.#deps.cache.invalidate(cacheKey(localLevelCode));
  }
}
