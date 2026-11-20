import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiRequestError, type Movie } from '../api';

const movie: Movie = {
  id: '986a8d52-13dc-49c3-b013-dd2e57a74f01',
  title: 'Test Movie', releaseYear: 2026, runtimeMinutes: 120,
  watched: false, prerequisites: [],
};

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('exact Express API contract', () => {
  it('fetches movies as an array with prerequisite UUIDs', async () => {
    const mock = vi.fn().mockResolvedValue(response([movie]));
    vi.stubGlobal('fetch', mock);
    expect(await api.listMovies()).toEqual([movie]);
    expect(mock.mock.calls[0][0]).toBe('/api/movies');
  });

  it('creates a movie with camelCase numeric fields and a UUID array', async () => {
    const mock = vi.fn().mockResolvedValue(response(movie, 201));
    vi.stubGlobal('fetch', mock);
    await api.createMovie({ title: 'Test Movie', releaseYear: 2026, runtimeMinutes: 120, prerequisites: [] });
    const [path, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/movies');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ title: 'Test Movie', releaseYear: 2026, runtimeMinutes: 120, prerequisites: [] });
  });

  it('PATCHes watched or prerequisites without sending other fields', async () => {
    const mock = vi.fn().mockResolvedValue(response({ ...movie, watched: true }));
    vi.stubGlobal('fetch', mock);
    await api.patchMovie(movie.id, { watched: true });
    const [path, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe(`/api/movies/${movie.id}`);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ watched: true });
  });

  it('fetches a full-object prerequisite order from the expected route', async () => {
    const mock = vi.fn().mockResolvedValue(response({
      targetMovieId: movie.id, prerequisites: [movie], watchedCount: 0, remainingRuntimeMinutes: 120,
    }));
    vi.stubGlobal('fetch', mock);
    const result = await api.rewatchOrder(movie.id);
    expect(mock.mock.calls[0][0]).toBe(`/api/movies/${movie.id}/rewatch-order`);
    expect(result.prerequisites[0].title).toBe('Test Movie');
  });

  it('creates cinemas with numeric bundleSizes and calls GET booking with groupSize query', async () => {
    const cinema = { id: movie.id, name: 'Test Cinema', bundleSizes: [1, 3, 4] };
    const mock = vi.fn()
      .mockResolvedValueOnce(response(cinema, 201))
      .mockResolvedValueOnce(response([cinema]))
      .mockResolvedValueOnce(response({ possible: true, totalBundles: 2, breakdown: [{ bundleSize: 3, count: 2 }] }));
    vi.stubGlobal('fetch', mock);
    await api.createCinema({ name: cinema.name, bundleSizes: cinema.bundleSizes });
    const [, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'Test Cinema', bundleSizes: [1, 3, 4] });
    await api.listCinemas();
    expect(mock.mock.calls[1][0]).toBe('/api/cinemas');
    const quote = await api.bookingQuote(cinema.id, 6);
    expect(mock.mock.calls[2][0]).toBe(`/api/cinemas/${cinema.id}/booking?groupSize=6`);
    expect(quote).toEqual({ possible: true, totalBundles: 2, breakdown: [{ bundleSize: 3, count: 2 }] });
  });

  it('propagates circular errors and field validation details from Express', async () => {
    const mock = vi.fn()
      .mockResolvedValueOnce(response({ error: 'CIRCULAR_DEPENDENCY', message: 'Movie prerequisites would create a circular dependency' }, 409))
      .mockResolvedValueOnce(response({ error: 'VALIDATION_ERROR', message: 'Invalid request data', details: [{ field: 'runtimeMinutes', message: 'Too big' }] }, 400));
    vi.stubGlobal('fetch', mock);
    await expect(api.patchMovie(movie.id, { prerequisites: [movie.id] })).rejects.toMatchObject({
      status: 409, code: 'CIRCULAR_DEPENDENCY',
    } satisfies Partial<ApiRequestError>);
    await expect(api.createMovie({ title: 'Bad', releaseYear: 2026, runtimeMinutes: 301, prerequisites: [] })).rejects.toMatchObject({
      status: 400, code: 'VALIDATION_ERROR', details: [{ field: 'runtimeMinutes', message: 'Too big' }],
    } satisfies Partial<ApiRequestError>);
  });
});
