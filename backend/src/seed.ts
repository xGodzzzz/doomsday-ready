import { randomUUID } from 'node:crypto';
import { Kysely } from 'kysely';
import { DatabaseProvider, lockGraphWrites, Schema } from './db';

const entries: ReadonlyArray<{
  title: string; releaseYear: number; runtimeMinutes: number; prerequisiteTitles: string[];
}> = [
  { title: 'Iron Man', releaseYear: 2008, runtimeMinutes: 126, prerequisiteTitles: [] },
  { title: 'Captain America: The First Avenger', releaseYear: 2011, runtimeMinutes: 124, prerequisiteTitles: [] },
  { title: 'The Avengers', releaseYear: 2012, runtimeMinutes: 143,
    prerequisiteTitles: ['Iron Man', 'Captain America: The First Avenger'] },
  { title: 'Captain America: Civil War', releaseYear: 2016, runtimeMinutes: 147,
    prerequisiteTitles: ['The Avengers'] },
  { title: 'Thor: Ragnarok', releaseYear: 2017, runtimeMinutes: 130, prerequisiteTitles: [] },
  { title: 'Avengers: Infinity War', releaseYear: 2018, runtimeMinutes: 149,
    prerequisiteTitles: ['Captain America: Civil War', 'Thor: Ragnarok'] },
  { title: 'Avengers: Endgame', releaseYear: 2019, runtimeMinutes: 181,
    prerequisiteTitles: ['Avengers: Infinity War'] },
  // 180 minutes is illustrative seed data, not a verified runtime.
  { title: 'Avengers: Doomsday', releaseYear: 2026, runtimeMinutes: 180,
    prerequisiteTitles: ['Avengers: Endgame'] },
];

export async function seedDatabase(db: Kysely<Schema>, provider: DatabaseProvider = 'sqlite') {
  return db.transaction().execute(async (trx) => {
    await lockGraphWrites(trx, provider);
    const first = await trx.selectFrom('movies').select('id').executeTakeFirst();
    if (first) return false;
    const ids = new Map(entries.map((entry) => [entry.title, randomUUID()]));
    for (const movie of entries) {
      await trx.insertInto('movies').values({
        id: ids.get(movie.title)!, title: movie.title, release_year: movie.releaseYear,
        runtime_minutes: movie.runtimeMinutes, watched: 0,
      }).execute();
    }
    for (const movie of entries) {
      for (const [position, title] of movie.prerequisiteTitles.entries()) {
        await trx.insertInto('movie_prerequisites').values({
          movie_id: ids.get(movie.title)!, prerequisite_id: ids.get(title)!, position,
        }).execute();
      }
    }
    return true;
  });
}
