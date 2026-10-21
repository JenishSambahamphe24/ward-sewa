import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { users } from '../../db/schema/index.ts';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export class UsersRepository {
  readonly #db: Db;

  constructor(db: Db) {
    this.#db = db;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const [user] = await this.#db.select().from(users).where(eq(users.phone, phone));
    return user ?? null;
  }

  async findById(id: number): Promise<User | null> {
    const [user] = await this.#db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async findOrCreateCitizen(phone: string): Promise<User> {
    const [created] = await this.#db
      .insert(users)
      .values({ phone })
      .onConflictDoNothing()
      .returning();
    const user = created ?? (await this.findByPhone(phone));
    if (!user) throw new Error('User vanished between insert and select');
    return user;
  }

  async create(values: NewUser): Promise<User> {
    const [user] = await this.#db.insert(users).values(values).returning();
    if (!user) throw new Error('INSERT ... RETURNING returned no row');
    return user;
  }

  async update(id: number, values: Partial<NewUser>): Promise<User> {
    const [user] = await this.#db.update(users).set(values).where(eq(users.id, id)).returning();
    if (!user) throw new Error('UPDATE ... RETURNING returned no row');
    return user;
  }
}
