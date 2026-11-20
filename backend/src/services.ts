import { randomUUID } from 'node:crypto';
import { Kysely } from 'kysely';
import { bookingQuote } from './algorithms/booking';
import { hasCycle, MovieNode, rewatchOrder } from './algorithms/graph';
import { DatabaseProvider, lockGraphWrites, Schema } from './db';
import { ApiError, MoviePatch, NewCinema, NewMovie } from './validation';

export interface Cinema {
  id: string;
  name: string;
  bundleSizes: number[];
}

export async function loadMovies(db: Kysely<Schema>): Promise<MovieNode[]> {
  const [rows, edges] = await Promise.all([
    db.selectFrom('movies').selectAll().orderBy('title').execute(),
    db.selectFrom('movie_prerequisites').selectAll()
      .orderBy('movie_id').orderBy('position').execute(),
  ]);
  const movies = rows.map((row) => ({
    id: row.id,
    title: row.title,
    releaseYear: row.release_year,
    runtimeMinutes: row.runtime_minutes,
    watched: row.watched === 1,
    prerequisites: [] as string[],
  }));
  const byId = new Map(movies.map((movie) => [movie.id, movie]));
  for (const edge of edges) byId.get(edge.movie_id)?.prerequisites.push(edge.prerequisite_id);
  return movies;
}

export async function loadCinemas(db: Kysely<Schema>): Promise<Cinema[]> {
  const [rows, sizes] = await Promise.all([
    db.selectFrom('cinemas').selectAll().orderBy('name').execute(),
    db.selectFrom('cinema_bundle_sizes').selectAll()
      .orderBy('cinema_id').orderBy('bundle_size').execute(),
  ]);
  const cinemas = rows.map((row) => ({ ...row, bundleSizes: [] as number[] }));
  const byId = new Map(cinemas.map((cinema) => [cinema.id, cinema]));
  for (const size of sizes) byId.get(size.cinema_id)?.bundleSizes.push(size.bundle_size);
  return cinemas;
}

function assertReferencesExist(ids: readonly string[], movies: readonly MovieNode[]): void {
  const known = new Set(movies.map((movie) => movie.id));
  for (const id of ids) {
    if (!known.has(id)) {
      throw new ApiError(400, 'INVALID_PREREQUISITE', `Prerequisite movie not found: ${id}`);
    }
  }
}
function assertNoCycle(movies: readonly MovieNode[]): void {
  const dependencies = new Map(movies.map((movie) => [movie.id, movie.prerequisites]));
  if (hasCycle(dependencies)) {
    throw new ApiError(409, 'CIRCULAR_DEPENDENCY', 'Movie prerequisites would create a circular dependency');
  }
}
function assertUniqueTitle(title: string, movies: readonly MovieNode[], exceptId?: string): void {
  if (movies.some((movie) => movie.title === title && movie.id !== exceptId)) {
    throw new ApiError(409, 'DUPLICATE_TITLE', 'A movie with this title already exists');
  }
}

export class DoomsdayService {
  constructor(private readonly db: Kysely<Schema>, private readonly provider: DatabaseProvider) {}

  listMovies(): Promise<MovieNode[]> { return loadMovies(this.db); }
  listCinemas(): Promise<Cinema[]> { return loadCinemas(this.db); }

  async createMovie(input: NewMovie): Promise<MovieNode> {
    return this.db.transaction().execute(async (trx) => {
      await lockGraphWrites(trx, this.provider);
      const existing = await loadMovies(trx);
      assertUniqueTitle(input.title, existing);
      assertReferencesExist(input.prerequisites, existing);
      const movie: MovieNode = { id: randomUUID(), ...input };
      assertNoCycle([...existing, movie]);
      await trx.insertInto('movies').values({
        id: movie.id, title: movie.title, release_year: movie.releaseYear,
        runtime_minutes: movie.runtimeMinutes, watched: Number(movie.watched),
      }).execute();
      for (const [position, prerequisite_id] of movie.prerequisites.entries()) {
        await trx.insertInto('movie_prerequisites')
          .values({ movie_id: movie.id, prerequisite_id, position }).execute();
      }
      return movie;
    });
  }

  async patchMovie(id: string, patch: MoviePatch): Promise<MovieNode> {
    return this.db.transaction().execute(async (trx) => {
      await lockGraphWrites(trx, this.provider);
      const all = await loadMovies(trx);
      const current = all.find((movie) => movie.id === id);
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Movie not found');
      const next: MovieNode = { ...current, ...patch };
      assertUniqueTitle(next.title, all, id);
      assertReferencesExist(next.prerequisites, all);
      assertNoCycle(all.map((movie) => movie.id === id ? next : movie));
      await trx.updateTable('movies').set({
        title: next.title, release_year: next.releaseYear,
        runtime_minutes: next.runtimeMinutes, watched: Number(next.watched),
      }).where('id', '=', id).execute();
      if (patch.prerequisites !== undefined) {
        await trx.deleteFrom('movie_prerequisites').where('movie_id', '=', id).execute();
        for (const [position, prerequisite_id] of next.prerequisites.entries()) {
          await trx.insertInto('movie_prerequisites')
            .values({ movie_id: id, prerequisite_id, position }).execute();
        }
      }
      return next;
    });
  }

  async getRewatchOrder(id: string) {
    const movies = await loadMovies(this.db);
    if (!movies.some((movie) => movie.id === id)) {
      throw new ApiError(404, 'NOT_FOUND', 'Movie not found');
    }
    return { targetMovieId: id, ...rewatchOrder(movies, id) };
  }

  async createCinema(input: NewCinema): Promise<Cinema> {
    const cinema: Cinema = { id: randomUUID(), ...input };
    await this.db.transaction().execute(async (trx) => {
      const exists = await trx.selectFrom('cinemas').select('id')
        .where('name', '=', cinema.name).executeTakeFirst();
      if (exists) throw new ApiError(409, 'DUPLICATE_NAME', 'A cinema with this name already exists');
      await trx.insertInto('cinemas').values({ id: cinema.id, name: cinema.name }).execute();
      for (const bundle_size of cinema.bundleSizes) {
        await trx.insertInto('cinema_bundle_sizes')
          .values({ cinema_id: cinema.id, bundle_size }).execute();
      }
    });
    return cinema;
  }

  async getBookingQuote(id: string, groupSize: number) {
    const cinema = (await loadCinemas(this.db)).find((item) => item.id === id);
    if (!cinema) throw new ApiError(404, 'NOT_FOUND', 'Cinema not found');
    return bookingQuote(cinema.bundleSizes, groupSize);
  }
}
