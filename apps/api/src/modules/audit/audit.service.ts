import type { ApplicationAccess } from '../applications/application-access.ts';
import { applicationIdSchema } from '../applications/applications.schema.ts';
import type { User } from '../users/users.repository.ts';
import type { AuditStore, StoredAuditEvent } from './audit.store.ts';

export interface AuditServiceDeps {
  access: ApplicationAccess;
  store: AuditStore;
}

export class AuditService {
  readonly #deps: AuditServiceDeps;

  constructor(deps: AuditServiceDeps) {
    this.#deps = deps;
  }

  async forApplication(user: User, applicationId: unknown): Promise<StoredAuditEvent[]> {
    const application = await this.#deps.access.find(
      user,
      applicationIdSchema.parse(applicationId),
    );
    return this.#deps.store.forApplication(application.id);
  }
}
