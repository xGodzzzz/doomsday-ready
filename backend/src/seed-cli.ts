import 'dotenv/config';
import { createDatabase, migrate } from './db';
import { seedDatabase } from './seed';

async function main(): Promise<void> {
  const provider = process.env.DATABASE_PROVIDER === 'postgres' ? 'postgres' : 'sqlite';
  const db = createDatabase({
    provider, sqlitePath: process.env.SQLITE_PATH, databaseUrl: process.env.DATABASE_URL,
  });
  try {
    await migrate(db);
    console.log((await seedDatabase(db, provider))
      ? 'Seeded 8 MCU movies.'
      : 'Movies already exist; no changes made.');
  } finally {
    await db.destroy();
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
