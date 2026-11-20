import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createDatabase, migrate } from '../src/db';
import { seedDatabase } from '../src/seed';
import { loadMovies } from '../src/services';

type TestDb = ReturnType<typeof createDatabase>;
let db: TestDb;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  db = createDatabase({ provider: 'sqlite', sqlitePath: ':memory:' });
  await migrate(db);
  await seedDatabase(db);
  app = createApp(db);
});
afterEach(async () => { await db.destroy(); });

async function idFor(title: string): Promise<string> {
  const movie = (await loadMovies(db)).find((entry) => entry.title === title);
  if (!movie) throw new Error(`Missing seed: ${title}`);
  return movie.id;
}

describe('movie endpoints', () => {
  it('returns the eight seed movies, with the exact expected relations', async () => {
    const res = await request(app).get('/api/movies');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
    const doomsday = res.body.find((movie: { title: string }) => movie.title === 'Avengers: Doomsday');
    expect(doomsday.prerequisites).toEqual([await idFor('Avengers: Endgame')]);
    expect(await seedDatabase(db)).toBe(false);
  });
  it('rewatches Doomsday in a valid seven-movie prerequisite order', async () => {
    const res = await request(app).get(`/api/movies/${await idFor('Avengers: Doomsday')}/rewatch-order`);
    expect(res.status).toBe(200);
    const movies = res.body.prerequisites as { id: string; prerequisites: string[] }[];
    expect(movies).toHaveLength(7);
    expect(new Set(movies.map((m) => m.id)).size).toBe(7);
    const position = new Map(movies.map((movie, index) => [movie.id, index]));
    for (const movie of movies) {
      for (const parent of movie.prerequisites) {
        expect(position.get(parent)).toBeLessThan(position.get(movie.id)!);
      }
    }
    expect(res.body.watchedCount).toBe(0);
    expect(res.body.remainingRuntimeMinutes).toBe(1000);
  });
  it('Civil War has both original movies before The Avengers', async () => {
    const res = await request(app).get(`/api/movies/${await idFor('Captain America: Civil War')}/rewatch-order`);
    const names = res.body.prerequisites.map((movie: { title: string }) => movie.title);
    expect(names).toHaveLength(3);
    expect(names.indexOf('Iron Man')).toBeLessThan(names.indexOf('The Avengers'));
    expect(names.indexOf('Captain America: The First Avenger')).toBeLessThan(names.indexOf('The Avengers'));
  });
  it('Ragnarok has empty rewatch order', async () => {
    const res = await request(app).get(`/api/movies/${await idFor('Thor: Ragnarok')}/rewatch-order`);
    expect(res.body.prerequisites).toEqual([]);
    expect(res.body.watchedCount).toBe(0);
    expect(res.body.remainingRuntimeMinutes).toBe(0);
  });
  it('returns HTTP 409 CIRCULAR_DEPENDENCY when Endgame is added to Iron Man', async () => {
    const ironManId = await idFor('Iron Man');
    const endgameId = await idFor('Avengers: Endgame');
    const res = await request(app).patch(`/api/movies/${ironManId}`)
      .send({ prerequisites: [endgameId] });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'CIRCULAR_DEPENDENCY',
      message: 'Movie prerequisites would create a circular dependency',
    });
    const unchanged = await request(app).get('/api/movies');
    expect(unchanged.body.find((movie: { id: string }) => movie.id === ironManId).prerequisites).toEqual([]);
  });
  it('rejects direct self-dependency', async () => {
    const id = await idFor('Iron Man');
    const res = await request(app).patch(`/api/movies/${id}`).send({ prerequisites: [id] });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CIRCULAR_DEPENDENCY');
  });
  it('creates movies with defaults; updates and validates inputs', async () => {
    const created = await request(app).post('/api/movies')
      .send({ title: 'A New Movie', releaseYear: 2026, runtimeMinutes: 111, prerequisites: [await idFor('Iron Man')] });
    expect(created.status).toBe(201);
    expect(created.body.watched).toBe(false);
    const updated = await request(app).patch(`/api/movies/${created.body.id}`).send({ watched: true });
    expect(updated.body.watched).toBe(true);
    const bad = await request(app).post('/api/movies')
      .send({ title: 'Invalid', releaseYear: 2020, runtimeMinutes: 301 });
    expect(bad.status).toBe(400);
    const duplicate = await request(app).post('/api/movies')
      .send({ title: 'Iron Man', releaseYear: 2008, runtimeMinutes: 126 });
    expect(duplicate.status).toBe(409);
  });
});

describe('cinema booking endpoints', () => {
  it.each([
    { sizes: [1, 3, 4], seats: 6, bundles: 2,
      breakdown: [{ bundleSize: 3, count: 2 }] },
    { sizes: [2, 5], seats: 11, bundles: 4,
      breakdown: [{ bundleSize: 5, count: 1 }, { bundleSize: 2, count: 3 }] },
    { sizes: [6, 9, 20], seats: 44, bundles: 4,
      breakdown: [{ bundleSize: 20, count: 1 }, { bundleSize: 9, count: 2 }, { bundleSize: 6, count: 1 }] },
  ])('minimizes bundles $sizes to seat $seats', async ({ sizes, seats, bundles, breakdown }) => {
    const cinema = await request(app).post('/api/cinemas')
      .send({ name: `Cinema-${seats}`, bundleSizes: sizes });
    expect(cinema.status).toBe(201);
    const booking = await request(app).get(`/api/cinemas/${cinema.body.id}/booking?groupSize=${seats}`);
    expect(booking.status).toBe(200);
    expect(booking.body).toEqual({ possible: true, totalBundles: bundles, breakdown });
  });
  it('returns impossible for [4,6] and 7', async () => {
    const cinema = await request(app).post('/api/cinemas')
      .send({ name: 'No Exact Seats', bundleSizes: [4, 6] });
    const res = await request(app).get(`/api/cinemas/${cinema.body.id}/booking?groupSize=7`);
    expect(res.body).toEqual({ possible: false, message: 'No exact bundle combination possible' });
  });
  it('lists cinemas and rejects duplicate sizes, invalid groups and missing cinemas', async () => {
    const created = await request(app).post('/api/cinemas')
      .send({ name: 'Main', bundleSizes: [2, 5] });
    expect(created.status).toBe(201);
    const listed = await request(app).get('/api/cinemas');
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].bundleSizes).toEqual([2, 5]);
    expect((await request(app).post('/api/cinemas')
      .send({ name: 'Bad', bundleSizes: [1, 1] })).status).toBe(400);
    expect((await request(app)
      .get(`/api/cinemas/${created.body.id}/booking?groupSize=10001`)).status).toBe(400);
    expect((await request(app)
      .get('/api/cinemas/not-a-real-id/booking?groupSize=6')).status).toBe(404);
  });
});
