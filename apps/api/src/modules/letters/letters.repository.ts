import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { issuedLetters, letterCounters } from '../../db/schema/index.ts';
import type { LetterSnapshot } from '../../db/schema/index.ts';
import type { ApplicationsRepository } from '../applications/applications.repository.ts';

export type IssuedLetter = typeof issuedLetters.$inferSelect;

export interface IssueLetter {
  applicationId: number;
  version: number;
  wardId: number;
  fiscalYear: string;
  issuedDateBs: string;
  verificationCode: string;
  snapshot: LetterSnapshot;
  issuedBy: number;
}

export class LettersRepository {
  readonly #db: Db;
  readonly #applications: ApplicationsRepository;

  constructor(db: Db, applications: ApplicationsRepository) {
    this.#db = db;
    this.#applications = applications;
  }

  // Status change, history, number and letter commit together; a rollback also undoes the
  // counter increment, so the register never skips a number.
  async issue(input: IssueLetter): Promise<IssuedLetter | null> {
    return this.#db.transaction(async (tx) => {
      const moved = await this.#applications.transition(
        {
          applicationId: input.applicationId,
          version: input.version,
          from: 'approved',
          to: 'issued',
          actorId: input.issuedBy,
        },
        tx,
      );
      if (!moved) return null;

      const [counter] = await tx
        .insert(letterCounters)
        .values({ wardId: input.wardId, fiscalYear: input.fiscalYear, lastNo: 1 })
        .onConflictDoUpdate({
          target: [letterCounters.wardId, letterCounters.fiscalYear],
          set: { lastNo: sql`${letterCounters.lastNo} + 1` },
        })
        .returning({ serialNo: letterCounters.lastNo });
      if (!counter) throw new Error('letter counter upsert returned no row');

      const [letter] = await tx
        .insert(issuedLetters)
        .values({
          applicationId: input.applicationId,
          wardId: input.wardId,
          fiscalYear: input.fiscalYear,
          serialNo: counter.serialNo,
          letterNo: `${input.fiscalYear}-${String(counter.serialNo).padStart(4, '0')}`,
          issuedDateBs: input.issuedDateBs,
          verificationCode: input.verificationCode,
          snapshot: input.snapshot,
          issuedBy: input.issuedBy,
        })
        .returning();
      if (!letter) throw new Error('INSERT ... RETURNING returned no row');
      return letter;
    });
  }

  async findByApplication(applicationId: number): Promise<IssuedLetter | null> {
    const [letter] = await this.#db
      .select()
      .from(issuedLetters)
      .where(eq(issuedLetters.applicationId, applicationId));
    return letter ?? null;
  }

  async findByVerificationCode(code: string): Promise<IssuedLetter | null> {
    const [letter] = await this.#db
      .select()
      .from(issuedLetters)
      .where(eq(issuedLetters.verificationCode, code));
    return letter ?? null;
  }

  async findById(id: number): Promise<IssuedLetter | null> {
    const [letter] = await this.#db.select().from(issuedLetters).where(eq(issuedLetters.id, id));
    return letter ?? null;
  }

  // First writer wins, so two workers racing on one letter can't both attach a PDF.
  async attachPdf(id: number, storageKey: string): Promise<boolean> {
    const updated = await this.#db
      .update(issuedLetters)
      .set({ pdfStorageKey: storageKey })
      .where(and(eq(issuedLetters.id, id), isNull(issuedLetters.pdfStorageKey)))
      .returning({ id: issuedLetters.id });
    return updated.length === 1;
  }

  async idsMissingPdf(limit: number): Promise<number[]> {
    const rows = await this.#db
      .select({ id: issuedLetters.id })
      .from(issuedLetters)
      .where(isNull(issuedLetters.pdfStorageKey))
      .orderBy(asc(issuedLetters.id))
      .limit(limit);
    return rows.map((row) => row.id);
  }
}
