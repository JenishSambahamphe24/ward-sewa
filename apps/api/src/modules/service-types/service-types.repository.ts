import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { serviceTypes } from '../../db/schema/index.ts';

export type ServiceType = typeof serviceTypes.$inferSelect;

export class ServiceTypesRepository {
  readonly #db: Db;

  constructor(db: Db) {
    this.#db = db;
  }

  listActive(localLevelCode: string): Promise<ServiceType[]> {
    return this.#db
      .select()
      .from(serviceTypes)
      .where(and(eq(serviceTypes.localLevelCode, localLevelCode), eq(serviceTypes.isActive, true)))
      .orderBy(serviceTypes.id);
  }

  async find(id: number): Promise<ServiceType | null> {
    const [serviceType] = await this.#db.select().from(serviceTypes).where(eq(serviceTypes.id, id));
    return serviceType ?? null;
  }

  async findActive(id: number): Promise<ServiceType | null> {
    const [serviceType] = await this.#db
      .select()
      .from(serviceTypes)
      .where(and(eq(serviceTypes.id, id), eq(serviceTypes.isActive, true)));
    return serviceType ?? null;
  }
}
