/** Exact JSON contracts from backend/src/app.ts and backend/src/services.ts. */
export interface Movie {
  id: string; // UUID, never numeric
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  prerequisites: string[]; // Movie IDs for GET /api/movies, POST and PATCH
}

export type NewMovie = Pick<Movie, 'title' | 'releaseYear' | 'runtimeMinutes' | 'prerequisites'>;
export type MoviePatch = Partial<Pick<Movie, 'title' | 'releaseYear' | 'runtimeMinutes' | 'watched' | 'prerequisites'>>;

export interface RewatchOrder {
  targetMovieId: string;
  prerequisites: Movie[]; // Full objects, unlike Movie.prerequisites
  watchedCount: number;
  remainingRuntimeMinutes: number;
}

export interface Cinema {
  id: string; // UUID
  name: string;
  bundleSizes: number[];
}

export type NewCinema = Pick<Cinema, 'name' | 'bundleSizes'>;

export type BookingQuote =
  | { possible: true; totalBundles: number; breakdown: { bundleSize: number; count: number }[] }
  | { possible: false; message: 'No exact bundle combination possible' };

export interface ValidationDetail {
  field: string;
  message: string;
}

interface ErrorPayload {
  error: string;
  message: string;
  details?: ValidationDetail[];
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ValidationDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  return typeof data.error === 'string' && typeof data.message === 'string';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body !== undefined) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    throw new ApiRequestError(
      0,
      'NETWORK_ERROR',
      'Unable to reach the backend API. Start the backend and check the Vite proxy port.',
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError(response.status, 'INVALID_RESPONSE', 'The API did not return JSON. Check that the backend is running and the Vite proxy targets the right port.');
  }

  if (!response.ok) {
    if (isErrorPayload(body)) {
      const details = Array.isArray(body.details)
        ? body.details.filter((item): item is ValidationDetail =>
          typeof item?.field === 'string' && typeof item?.message === 'string')
        : [];
      throw new ApiRequestError(response.status, body.error, body.message, details);
    }
    throw new ApiRequestError(response.status, 'REQUEST_FAILED', `Request failed (HTTP ${response.status}).`);
  }

  return body as T;
}

export const api = {
  listMovies: () => request<Movie[]>('/movies'),
  createMovie: (payload: NewMovie) => request<Movie>('/movies', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  patchMovie: (id: string, payload: MoviePatch) => request<Movie>(`/movies/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify(payload),
  }),
  rewatchOrder: (id: string) => request<RewatchOrder>(`/movies/${encodeURIComponent(id)}/rewatch-order`),
  listCinemas: () => request<Cinema[]>('/cinemas'),
  createCinema: (payload: NewCinema) => request<Cinema>('/cinemas', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  bookingQuote: (id: string, groupSize: number) => request<BookingQuote>(
    `/cinemas/${encodeURIComponent(id)}/booking?groupSize=${encodeURIComponent(String(groupSize))}`,
  ),
};
