import { z } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const title = z.string().trim().min(1).max(255);
const prerequisites = z.array(z.string().uuid()).refine(
  (ids) => new Set(ids).size === ids.length,
  'Prerequisites must be unique',
);
const movieFields = z.object({
  title,
  releaseYear: z.number().int(),
  runtimeMinutes: z.number().int().min(1).max(300),
  watched: z.boolean(),
  prerequisites,
}).strict();
export const createMovieSchema = movieFields.extend({
  watched: z.boolean().default(false),
  prerequisites: prerequisites.default([]),
});
export const updateMovieSchema = movieFields.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field must be provided',
);
export const createCinemaSchema = z.object({
  name: title,
  bundleSizes: z.array(z.number().int().min(1).max(500)).min(1).max(10).refine(
    (sizes) => new Set(sizes).size === sizes.length,
    'Bundle sizes must be unique',
  ),
}).strict();

export type NewMovie = z.infer<typeof createMovieSchema>;
export type MoviePatch = z.infer<typeof updateMovieSchema>;
export type NewCinema = z.infer<typeof createCinemaSchema>;

export function parseGroupSize(value: unknown): number {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'groupSize must be an integer between 1 and 10000');
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 10_000) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'groupSize must be an integer between 1 and 10000');
  }
  return n;
}
