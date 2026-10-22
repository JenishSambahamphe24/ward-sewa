import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Db, DbExecutor } from '../../db/client.ts';
import {
  applicationStatusHistory,
  applications,
  serviceTypes,
  users,
  wards,
} from '../../db/schema/index.ts';
import { CodeHelper } from '../../lib/code.helper.ts';
import type { ListApplicationsQuery, WardQueueQuery } from './applications.schema.ts';

export type ApplicationStatus = (typeof applications.$inferSelect)['status'];
export const EDITABLE_STATUSES: ApplicationStatus[] = ['draft', 'needs_info'];

export interface ApplicationView {
  id: number;
  trackingNo: string;
  status: ApplicationStatus;
  version: number;
  applicant: { id: number; name: string | null; phone: string };
  serviceType: { id: number; code: string; nameEn: string; nameNe: string; fee: string };
  address: { localLevelCode: string; wardNo: number; tole: string; houseNo: string | null };
  formData: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
}

export interface NewApplication {
  citizenId: number;
  wardId: number;
  serviceTypeId: number;
  tole: string;
  houseNo?: string;
  formData: Record<string, string>;
}

export interface StatusChange {
  applicationId: number;
  version: number;
  from: ApplicationStatus;
  to: ApplicationStatus;
  actorId: number;
  note?: string;
}

export interface ApplicationChanges {
  tole?: string;
  houseNo?: string;
  formData?: Record<string, string>;
}

const trackingNo = () => {
  const chars = CodeHelper.random(8);
  return `WS-${chars.slice(0, 4)}-${chars.slice(4)}`;
};

export class ApplicationsRepository {
  readonly #db: Db;

  constructor(db: Db) {
    this.#db = db;
  }

  async create(values: NewApplication): Promise<number> {
    return this.#db.transaction(async (tx) => {
      const [row] = await tx
        .insert(applications)
        .values({ ...values, trackingNo: trackingNo() })
        .returning({ id: applications.id });
      if (!row) throw new Error('INSERT ... RETURNING returned no row');
      await tx
        .insert(applicationStatusHistory)
        .values({ applicationId: row.id, toStatus: 'draft', actorId: values.citizenId });
      return row.id;
    });
  }

  // Status and its history row change together or not at all. Matching on `version` also
  // proves the status is still `from`, since every status change bumps the version.
  // Pass `executor` to join a caller's transaction (issuing a letter does more in the same one).
  async transition(change: StatusChange, executor?: DbExecutor): Promise<boolean> {
    const run = async (tx: DbExecutor) => {
      const updated = await tx
        .update(applications)
        .set({
          status: change.to,
          version: sql`${applications.version} + 1`,
          ...(change.to === 'submitted' ? { submittedAt: new Date() } : {}),
        })
        .where(
          and(
            eq(applications.id, change.applicationId),
            eq(applications.version, change.version),
            eq(applications.status, change.from),
          ),
        )
        .returning({ id: applications.id });
      if (updated.length === 0) return false;

      await tx.insert(applicationStatusHistory).values({
        applicationId: change.applicationId,
        fromStatus: change.from,
        toStatus: change.to,
        actorId: change.actorId,
        note: change.note,
      });
      return true;
    };
    return executor ? run(executor) : this.#db.transaction(run);
  }

  history(applicationId: number) {
    return this.#db
      .select({
        fromStatus: applicationStatusHistory.fromStatus,
        toStatus: applicationStatusHistory.toStatus,
        note: applicationStatusHistory.note,
        at: applicationStatusHistory.createdAt,
      })
      .from(applicationStatusHistory)
      .where(eq(applicationStatusHistory.applicationId, applicationId))
      .orderBy(applicationStatusHistory.createdAt, applicationStatusHistory.id);
  }

  async findForCitizen(citizenId: number, id: number): Promise<ApplicationView | null> {
    const [application] = await this.#select(
      eq(applications.citizenId, citizenId),
      eq(applications.id, id),
    ).limit(1);
    return application ?? null;
  }

  async listForCitizen(
    citizenId: number,
    { page, limit }: ListApplicationsQuery,
  ): Promise<{ items: ApplicationView[]; total: number }> {
    const [items, [totals]] = await Promise.all([
      this.#select(eq(applications.citizenId, citizenId))
        .orderBy(desc(applications.createdAt), desc(applications.id))
        .limit(limit)
        .offset((page - 1) * limit),
      this.#db
        .select({ total: count() })
        .from(applications)
        .where(eq(applications.citizenId, citizenId)),
    ]);
    return { items, total: totals?.total ?? 0 };
  }

  // Staff never see drafts: an unsubmitted application is still the citizen's own.
  async findForWard(wardId: number, id: number): Promise<ApplicationView | null> {
    const [application] = await this.#select(
      ...this.#wardScope(wardId),
      eq(applications.id, id),
    ).limit(1);
    return application ?? null;
  }

  async listForWard(
    wardId: number,
    { status, serviceTypeId, page, limit }: WardQueueQuery,
  ): Promise<{ items: ApplicationView[]; total: number }> {
    const conditions = [
      ...this.#wardScope(wardId),
      status ? eq(applications.status, status) : undefined,
      serviceTypeId ? eq(applications.serviceTypeId, serviceTypeId) : undefined,
    ].filter((condition): condition is SQL => condition !== undefined);

    const [items, [totals]] = await Promise.all([
      // Oldest first: the queue is served in the order citizens applied.
      this.#select(...conditions)
        .orderBy(asc(applications.createdAt), asc(applications.id))
        .limit(limit)
        .offset((page - 1) * limit),
      this.#db
        .select({ total: count() })
        .from(applications)
        .where(and(...conditions)),
    ]);
    return { items, total: totals?.total ?? 0 };
  }

  // Optimistic lock: matches only if nobody changed the row since the client read `version`.
  async updateEditable(
    citizenId: number,
    id: number,
    version: number,
    changes: ApplicationChanges,
  ): Promise<boolean> {
    const updated = await this.#db
      .update(applications)
      .set({ ...changes, version: sql`${applications.version} + 1` })
      .where(
        and(
          eq(applications.id, id),
          eq(applications.citizenId, citizenId),
          eq(applications.version, version),
          inArray(applications.status, EDITABLE_STATUSES),
        ),
      )
      .returning({ id: applications.id });
    return updated.length === 1;
  }

  #wardScope(wardId: number): SQL[] {
    return [eq(applications.wardId, wardId), ne(applications.status, 'draft')];
  }

  #select(...conditions: SQL[]) {
    return this.#db
      .select({
        id: applications.id,
        trackingNo: applications.trackingNo,
        status: applications.status,
        version: applications.version,
        applicant: { id: users.id, name: users.name, phone: users.phone },
        serviceType: {
          id: serviceTypes.id,
          code: serviceTypes.code,
          nameEn: serviceTypes.nameEn,
          nameNe: serviceTypes.nameNe,
          fee: serviceTypes.fee,
        },
        address: {
          localLevelCode: wards.localLevelCode,
          wardNo: wards.wardNo,
          tole: applications.tole,
          houseNo: applications.houseNo,
        },
        formData: applications.formData,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        submittedAt: applications.submittedAt,
      })
      .from(applications)
      .innerJoin(serviceTypes, eq(applications.serviceTypeId, serviceTypes.id))
      .innerJoin(wards, eq(applications.wardId, wards.id))
      .innerJoin(users, eq(applications.citizenId, users.id))
      .where(and(...conditions))
      .$dynamic();
  }
}
