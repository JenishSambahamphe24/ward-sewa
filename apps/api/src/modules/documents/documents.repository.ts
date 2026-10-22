import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { documents } from '../../db/schema/index.ts';

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export class DocumentsRepository {
  readonly #db: Db;

  constructor(db: Db) {
    this.#db = db;
  }

  // One file per required document: uploading again replaces the previous one.
  async replace(values: NewDocument): Promise<{ document: Document; replacedKey: string | null }> {
    return this.#db.transaction(async (tx) => {
      const [previous] = await tx
        .delete(documents)
        .where(
          and(
            eq(documents.applicationId, values.applicationId),
            eq(documents.documentCode, values.documentCode),
          ),
        )
        .returning({ storageKey: documents.storageKey });
      const [document] = await tx.insert(documents).values(values).returning();
      if (!document) throw new Error('INSERT ... RETURNING returned no row');
      return { document, replacedKey: previous?.storageKey ?? null };
    });
  }

  list(applicationId: number): Promise<Document[]> {
    return this.#db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId))
      .orderBy(documents.id);
  }

  async find(applicationId: number, id: number): Promise<Document | null> {
    const [document] = await this.#db
      .select()
      .from(documents)
      .where(and(eq(documents.applicationId, applicationId), eq(documents.id, id)));
    return document ?? null;
  }
}
