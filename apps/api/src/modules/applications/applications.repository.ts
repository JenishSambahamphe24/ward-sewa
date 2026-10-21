import { randomBytes } from 'node:crypto';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { applications, serviceTypes, wards } from '../../db/schema/index.ts';
import type { ListApplicationsQuery } from './applications.schema.ts';

export type ApplicationStatus = (typeof applications.$inferSelect)['status'];
export const EDITABLE_STATUSES: ApplicationStatus[] = ['draft', 'needs_info'];

export interface ApplicationView {
  id: number;
  trackingNo: string;
  status: ApplicationStatus;
  version: number;
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

export interface ApplicationChanges {
  tole?: string;
  houseNo?: string;
  formData?: Record<string, string>;
}

// Crockford base32 (no I, L, O, U): easy to read out over the phone. 256 % 32 = 0, so no bias.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const trackingNo = () => {
  const chars = [...randomBytes(8)].map((byte) => ALPHABET[byte % 32]).join('');
  return `WS-${chars.slice(0, 4)}-${chars.slice(4)}`;
};

export class ApplicationsRepository {
  readonly #db: Db;

  constructor(db: Db) {
    this.#db = db;
  }

  async create(values: NewApplication): Promise<number> {
    const [row] = await this.#db
      .insert(applications)
      .values({ ...values, trackingNo: trackingNo() })
      .returning({ id: applications.id });
    if (!row) throw new Error('INSERT ... RETURNING returned no row');
    return row.id;
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

  #select(...conditions: SQL[]) {
    return this.#db
      .select({
        id: applications.id,
        trackingNo: applications.trackingNo,
        status: applications.status,
        version: applications.version,
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
      .where(and(...conditions))
      .$dynamic();
  }
}
