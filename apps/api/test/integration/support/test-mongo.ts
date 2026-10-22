import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';

// The driver connects lazily, so files that never touch MongoDB open no connection.
let client: MongoClient | null = null;

export class TestMongo {
  static readonly url = process.env.TEST_MONGO_URL ?? 'mongodb://localhost:27017/ward_sewa_test';

  static db(): Db {
    client ??= new MongoClient(TestMongo.url, { serverSelectionTimeoutMS: 2000 });
    const db = client.db();
    if (!db.databaseName.endsWith('_test')) throw new Error(`Refusing to use "${db.databaseName}"`);
    return db;
  }

  static async reset(): Promise<void> {
    await TestMongo.db().dropDatabase();
  }

  static async close(): Promise<void> {
    await client?.close();
    client = null;
  }
}
