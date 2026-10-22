import type { Db, Tx } from './client.ts';

// Lets a service group several repository calls into one transaction without touching SQL.
export class TransactionRunner {
  readonly #db: Db;

  constructor(db: Db) {
    this.#db = db;
  }

  run<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    return this.#db.transaction(work);
  }
}
