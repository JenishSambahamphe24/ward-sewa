import { AppError } from '../../lib/app-error.ts';
import type { User } from '../users/users.repository.ts';
import type { ApplicationView, ApplicationsRepository } from './applications.repository.ts';

// The one place that decides who may see an application. Anything else is a 404, so the
// existence of other people's applications is never revealed.
export class ApplicationAccess {
  readonly #applications: ApplicationsRepository;

  constructor(applications: ApplicationsRepository) {
    this.#applications = applications;
  }

  async find(user: User, id: number): Promise<ApplicationView> {
    const application = await this.#lookup(user, id);
    if (!application) throw new AppError(404, 'NOT_FOUND', 'No such application');
    return application;
  }

  #lookup(user: User, id: number): Promise<ApplicationView | null> {
    if (user.role === 'citizen') return this.#applications.findForCitizen(user.id, id);
    if (user.wardId !== null && (user.role === 'ward_secretary' || user.role === 'ward_chair')) {
      return this.#applications.findForWard(user.wardId, id);
    }
    return Promise.resolve(null);
  }
}
