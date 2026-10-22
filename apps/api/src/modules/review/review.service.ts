import { AppError } from '../../lib/app-error.ts';
import type { ApplicationAccess } from '../applications/application-access.ts';
import type {
  ApplicationStatus,
  ApplicationView,
  ApplicationsRepository,
} from '../applications/applications.repository.ts';
import {
  applicationIdSchema,
  transitionSchema,
  wardQueueQuerySchema,
} from '../applications/applications.schema.ts';
import type { User } from '../users/users.repository.ts';

type StaffRole = 'ward_secretary' | 'ward_chair';
type StaffTarget = 'under_review' | 'needs_info' | 'rejected' | 'approved';

interface TransitionRule {
  from: ApplicationStatus[];
  roles: StaffRole[];
  noteRequired: boolean;
}

// Only the chair approves: the chair signs the letter.
export const TRANSITIONS: Record<StaffTarget, TransitionRule> = {
  under_review: { from: ['submitted'], roles: ['ward_secretary'], noteRequired: false },
  needs_info: {
    from: ['under_review'],
    roles: ['ward_secretary', 'ward_chair'],
    noteRequired: true,
  },
  rejected: { from: ['under_review'], roles: ['ward_secretary', 'ward_chair'], noteRequired: true },
  approved: { from: ['under_review'], roles: ['ward_chair'], noteRequired: false },
};

export interface ReviewServiceDeps {
  applications: ApplicationsRepository;
  access: ApplicationAccess;
}

export class ReviewService {
  readonly #deps: ReviewServiceDeps;

  constructor(deps: ReviewServiceDeps) {
    this.#deps = deps;
  }

  async queue(staff: User, query: unknown) {
    const wardId = this.#wardOf(staff);
    const { status, serviceTypeId, page, limit } = wardQueueQuerySchema.parse(query);
    const { items, total } = await this.#deps.applications.listForWard(wardId, {
      status,
      serviceTypeId,
      page,
      limit,
    });
    return { items, page, limit, total };
  }

  get(staff: User, id: unknown): Promise<ApplicationView> {
    this.#wardOf(staff);
    return this.#deps.access.find(staff, applicationIdSchema.parse(id));
  }

  async transition(staff: User, id: unknown, input: unknown): Promise<ApplicationView> {
    const { to, version, note } = transitionSchema.parse(input);
    const application = await this.get(staff, id);
    const rule = TRANSITIONS[to];

    if (!rule.roles.includes(staff.role as StaffRole)) {
      throw new AppError(403, 'FORBIDDEN', `A ${staff.role} can't move an application to ${to}`);
    }
    if (!rule.from.includes(application.status)) {
      throw new AppError(409, 'CONFLICT', `Can't move from ${application.status} to ${to}`);
    }
    if (rule.noteRequired && !note) {
      throw new AppError(400, 'VALIDATION_FAILED', `Say why when moving to ${to}`);
    }

    const moved = await this.#deps.applications.transition({
      applicationId: application.id,
      version,
      from: application.status,
      to,
      actorId: staff.id,
      actorRole: staff.role,
      note,
    });
    if (!moved) {
      throw new AppError(
        409,
        'CONFLICT',
        'This application changed since you loaded it; reload it',
      );
    }
    return this.#deps.access.find(staff, application.id);
  }

  #wardOf(staff: User): number {
    if (staff.wardId === null || (staff.role !== 'ward_secretary' && staff.role !== 'ward_chair')) {
      throw new AppError(403, 'FORBIDDEN', 'Only ward staff review applications');
    }
    return staff.wardId;
  }
}
