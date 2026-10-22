import { and, eq, inArray, ne } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { users, wards } from '../../db/schema/index.ts';
import type { ListStaffQuery, StaffRole } from './staff.schema.ts';

export interface StaffMember {
  id: number;
  phone: string;
  name: string | null;
  role: StaffRole;
  isActive: boolean;
  ward: { id: number; wardNo: number };
}

export interface StaffChanges {
  name?: string;
  role?: StaffRole;
  wardId?: number;
  isActive?: boolean;
}

const STAFF_ROLES: StaffRole[] = ['ward_secretary', 'ward_chair'];

export class StaffRepository {
  readonly #db: Db;

  constructor(db: Db) {
    this.#db = db;
  }

  list(localLevelCode: string, query: ListStaffQuery = {}): Promise<StaffMember[]> {
    return this.#select(
      localLevelCode,
      inArray(users.role, query.role ? [query.role] : STAFF_ROLES),
      query.wardNo ? eq(wards.wardNo, query.wardNo) : undefined,
      query.active ? eq(users.isActive, query.active === 'true') : undefined,
    );
  }

  async find(localLevelCode: string, id: number): Promise<StaffMember | null> {
    const [member] = await this.#select(
      localLevelCode,
      inArray(users.role, STAFF_ROLES),
      eq(users.id, id),
    );
    return member ?? null;
  }

  // Joining through wards is what scopes staff to one municipality.
  async #select(localLevelCode: string, ...conditions: (SQL | undefined)[]) {
    const rows = await this.#db
      .select({
        id: users.id,
        phone: users.phone,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        wardId: wards.id,
        wardNo: wards.wardNo,
      })
      .from(users)
      .innerJoin(wards, eq(users.wardId, wards.id))
      .where(and(eq(wards.localLevelCode, localLevelCode), ...conditions))
      .orderBy(wards.wardNo, users.role, users.id);

    return rows.map(({ wardId, wardNo, role, ...rest }): StaffMember => ({
      ...rest,
      role: role as StaffRole,
      ward: { id: wardId, wardNo },
    }));
  }

  async hasActiveChair(wardId: number, exceptUserId?: number): Promise<boolean> {
    const [chair] = await this.#db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.wardId, wardId),
          eq(users.role, 'ward_chair'),
          eq(users.isActive, true),
          exceptUserId ? ne(users.id, exceptUserId) : undefined,
        ),
      );
    return Boolean(chair);
  }

  async update(id: number, changes: StaffChanges): Promise<void> {
    await this.#db.update(users).set(changes).where(eq(users.id, id));
  }
}
