import express, { ErrorRequestHandler, RequestHandler } from 'express';
import { Kysely } from 'kysely';
import { ZodError } from 'zod';
import { DatabaseProvider, Schema } from './db';
import { DoomsdayService } from './services';
import {
  ApiError, createCinemaSchema, createMovieSchema, parseGroupSize, updateMovieSchema,
} from './validation';

const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: string }).code;
  return code === '23505' || code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY';
}

export function createApp(db: Kysely<Schema>, provider: DatabaseProvider = 'sqlite') {
  const app = express();
  const service = new DoomsdayService(db, provider);
  app.use(express.json({ limit: '100kb' }));

  app.post('/api/movies', asyncRoute(async (req, res) => {
    const movie = await service.createMovie(createMovieSchema.parse(req.body));
    res.status(201).json(movie);
  }));

  app.get('/api/movies', asyncRoute(async (_req, res) => {
    res.json(await service.listMovies());
  }));

  app.patch('/api/movies/:id', asyncRoute(async (req, res) => {
    res.json(await service.patchMovie(req.params.id, updateMovieSchema.parse(req.body)));
  }));

  app.get('/api/movies/:id/rewatch-order', asyncRoute(async (req, res) => {
    res.json(await service.getRewatchOrder(req.params.id));
  }));

  app.post('/api/cinemas', asyncRoute(async (req, res) => {
    const cinema = await service.createCinema(createCinemaSchema.parse(req.body));
    res.status(201).json(cinema);
  }));

  app.get('/api/cinemas', asyncRoute(async (_req, res) => {
    res.json(await service.listCinemas());
  }));

  app.get('/api/cinemas/:id/booking', asyncRoute(async (req, res) => {
    const groupSize = parseGroupSize(req.query.groupSize);
    res.json(await service.getBookingQuote(req.params.id, groupSize));
  }));

  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Endpoint not found')));

  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'VALIDATION_ERROR', message: 'Invalid request data',
        details: error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
      });
      return;
    }
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: error.code, message: error.message });
      return;
    }
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'DUPLICATE_VALUE', message: 'A unique value already exists' });
      return;
    }
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Malformed JSON request body' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected server error' });
  };
  app.use(errorHandler);
  return app;
}
