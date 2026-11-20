import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Kysely, PostgresDialect, SqliteDialect, sql } from 'kysely';
import { Pool } from 'pg';

export interface Schema {
  movies: {
    id: string;
    title: string;
    release_year: number;
    runtime_minutes: number;
    watched: number;
  };
  movie_prerequisites: {
    movie_id: string;
    prerequisite_id: string;
    position: number;
  };
  cinemas: {
    id: string;
    name: string;
  };
  cinema_bundle_sizes: {
    cinema_id: string;
    bundle_size: number;
  };
}

export type DatabaseProvider = 'sqlite' | 'postgres';
export interface DatabaseOptions {
  provider: DatabaseProvider;
  sqlitePath?: string;
  databaseUrl?: string;
}

export function createDatabase(options: DatabaseOptions): Kysely<Schema> {
  if (options.provider === 'postgres') {
    if (!options.databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL');
    return new Kysely<Schema>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: options.databaseUrl }) }),
    });
  }
  const path = options.sqlitePath ?? './data/doomsday.sqlite';
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('foreign_keys = ON');
  return new Kysely<Schema>({ dialect: new SqliteDialect({ database: sqlite }) });
}

export async function migrate(db: Kysely<Schema>): Promise<void> {
  await db.schema.createTable('movies').ifNotExists()
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('title', 'varchar(255)', (c) => c.notNull().unique())
    .addColumn('release_year', 'integer', (c) => c.notNull())
    .addColumn('runtime_minutes', 'integer', (c) => c.notNull())
    .addColumn('watched', 'integer', (c) => c.notNull().defaultTo(0))
    .addCheckConstraint('movies_runtime_range', sql`runtime_minutes BETWEEN 1 AND 300`)
    .addCheckConstraint('movies_watched_boolean', sql`watched IN (0, 1)`)
    .execute();
  await db.schema.createTable('movie_prerequisites').ifNotExists()
    .addColumn('movie_id', 'varchar(36)', (c) => c.notNull())
    .addColumn('prerequisite_id', 'varchar(36)', (c) => c.notNull())
    .addColumn('position', 'integer', (c) => c.notNull())
    .addPrimaryKeyConstraint('movie_prerequisites_pk', ['movie_id', 'prerequisite_id'])
    .addForeignKeyConstraint('prerequisite_movie_fk', ['movie_id'], 'movies', ['id'], (fk) => fk.onDelete('cascade'))
    .addForeignKeyConstraint('prerequisite_parent_fk', ['prerequisite_id'], 'movies', ['id'], (fk) => fk.onDelete('cascade'))
    .execute();
  await db.schema.createTable('cinemas').ifNotExists()
    .addColumn('id', 'varchar(36)', (c) => c.primaryKey())
    .addColumn('name', 'varchar(255)', (c) => c.notNull().unique())
    .execute();
  await db.schema.createTable('cinema_bundle_sizes').ifNotExists()
    .addColumn('cinema_id', 'varchar(36)', (c) => c.notNull())
    .addColumn('bundle_size', 'integer', (c) => c.notNull())
    .addPrimaryKeyConstraint('cinema_bundle_sizes_pk', ['cinema_id', 'bundle_size'])
    .addForeignKeyConstraint('bundle_cinema_fk', ['cinema_id'], 'cinemas', ['id'], (fk) => fk.onDelete('cascade'))
    .addCheckConstraint('cinema_bundle_range', sql`bundle_size BETWEEN 1 AND 500`)
    .execute();
}

// Serialize graph writes in PostgreSQL so concurrent updates cannot introduce cycles.
export async function lockGraphWrites(db: Kysely<Schema>, provider: DatabaseProvider): Promise<void> {
  if (provider === 'postgres') await sql`SELECT pg_advisory_xact_lock(74219031)`.execute(db);
}
