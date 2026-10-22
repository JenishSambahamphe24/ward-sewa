import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { wards } from '../../db/schema/index.ts';

export class WardsRepository {
  readonly #db: Db;

  constructor(db: Db) {
    this.#db = db;
  }

  async findId(localLevelCode: string, wardNo: number): Promise<number | null> {
    const [ward] = await this.#db
      .select({ id: wards.id })
      .from(wards)
      .where(and(eq(wards.localLevelCode, localLevelCode), eq(wards.wardNo, wardNo)));
    return ward?.id ?? null;
  }
}
