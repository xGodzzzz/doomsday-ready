# Doomsday Ready — Backend

Node.js + Express + TypeScript REST API, Kysely SQL query builder, SQLite default / PostgreSQL optional, Vitest + Supertest tests. No graph or optimization packages are used.

## Requirements

- Node.js 20+
- npm
- Optional: a running PostgreSQL database for `DATABASE_PROVIDER=postgres`

## Install and run

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

The API starts at `http://localhost:3000`. The server automatically creates any missing tables. `npm run seed` inserts the eight MCU films only when the `movies` table is empty; running it repeatedly is safe.

To use PostgreSQL, set these variables in `.env`:

```ini
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/doomsday_ready
```

Create the named PostgreSQL database before running. If `DATABASE_PROVIDER=sqlite`, `SQLITE_PATH=./data/doomsday.sqlite` is used by default, and the directory is created automatically. Do not put production secrets in `.env.example`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start API with TypeScript watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled API |
| `npm run seed` | Insert the eight MCU movies if movies are empty |
| `npm test` | Run pure algorithm and HTTP integration tests |
| `npm run test:watch` | Watch tests |

## HTTP API

### Create a movie

```http
POST /api/movies
Content-Type: application/json

{"title":"Sample Movie","releaseYear":2026,"runtimeMinutes":120,"watched":false,"prerequisites":[]}
```

Returns `201` with the new movie including its UUID. `watched` and `prerequisites` are optional, defaulting to `false` and `[]`. Prerequisites are UUID references to existing movies.

### List or update movies

```http
GET /api/movies
PATCH /api/movies/:id
Content-Type: application/json

{"watched":true}
```

The list includes each movie's `prerequisites` UUID array. PATCH supports any nonempty subset of `title`, `releaseYear`, `runtimeMinutes`, `watched` and `prerequisites`. Sending `prerequisites: []` clears dependencies. Every graph mutation is cycle-checked atomically.

### Rewatch order

```http
GET /api/movies/:id/rewatch-order
```

Returns JSON with `targetMovieId`, `prerequisites` (an array of full movie objects), `watchedCount`, and `remainingRuntimeMinutes`.

The `prerequisites` array contains all transitive prerequisite movie objects once in prerequisite-first order. The target itself is excluded.

### Cinemas and booking quotes

```http
POST /api/cinemas
Content-Type: application/json

{"name":"Downtown Cinema","bundleSizes":[1,3,4]}
```

```http
GET /api/cinemas
GET /api/cinemas/:id/booking?groupSize=6
```

For the sample cinema, the quote is:

```json
{"possible":true,"totalBundles":2,"breakdown":[{"bundleSize":3,"count":2}]}
```

If an exact combination is not possible:

```json
{"possible":false,"message":"No exact bundle combination possible"}
```

### Error responses

- `400` `VALIDATION_ERROR`: malformed input, out-of-range values, or invalid body.
- `400` `INVALID_PREREQUISITE`: prerequisite UUID is valid but does not reference an existing movie.
- `404` `NOT_FOUND`: unknown resource or endpoint.
- `409` `CIRCULAR_DEPENDENCY`: proposed movie dependencies contain a cycle.
- `409` `DUPLICATE_TITLE`, `DUPLICATE_NAME`, or `DUPLICATE_VALUE`: unique constraints violated.

Example cycle error:

```json
{"error":"CIRCULAR_DEPENDENCY","message":"Movie prerequisites would create a circular dependency"}
```

## Algorithms and complexity

- Cycle detection: a hand-written DFS with gray/black visit states; **O(V + E)**.
- Rewatch order: hand-written prerequisite-first DFS; **O(V + E)** maximum for the reachable portion, with each ancestor emitted at most once.
- Booking quote: unbounded minimum-coin dynamic programming plus optimal bundle reconstruction; **O(groupSize × bundleSizes.length)** time, **O(groupSize)** memory. Ties prefer larger bundles where encountered first.

No third-party cycle detector, topological sorter, or optimizer is installed.

## Seed data note

Runtime values for released films are supplied for demonstration. The **180-minute runtime for Avengers: Doomsday is illustrative test data, not a verified official runtime**; runtime was not specified in the assessment seed requirements.

## Testing

```bash
npm test
```

Tests cover all requested rewatch scenarios, both direct and indirect cycles, all four booking examples, endpoint validation, defaults, updates and seed idempotence. The integration tests run against a fresh in-memory SQLite database, so they do not change your persistent database.
