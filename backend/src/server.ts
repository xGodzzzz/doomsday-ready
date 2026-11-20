import 'dotenv/config';
import { createApp } from './app';
import { createDatabase, migrate } from './db';

async function main(): Promise<void> {
  const provider = process.env.DATABASE_PROVIDER === 'postgres' ? 'postgres' : 'sqlite';
  const db = createDatabase({
    provider, sqlitePath: process.env.SQLITE_PATH, databaseUrl: process.env.DATABASE_URL,
  });
  try {
    await migrate(db);
    const port = Number(process.env.PORT ?? 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('PORT must be an integer between 1 and 65535');
    }
    const server = createApp(db, provider).listen(port, () => {
      console.log(`Doomsday Ready API listening at http://localhost:${port}`);
    });
    let closing = false;
    const shutdown = () => {
      if (closing) return;
      closing = true;
      server.close(() => { void db.destroy().then(() => process.exit(0)); });
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    await db.destroy();
    throw error;
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
