# Doomsday Ready

A full-stack, MCU-themed technical assessment built with an Express/TypeScript API, Kysely SQL models, and a React/Vite/TypeScript frontend. It supports prerequisite-aware rewatch planning and minimum-bundle watch-party seating quotes.

## Project Overview

**Feature 1 — Movies and rewatch planning:** Create and edit movies, mark titles watched/unwatched, attach prerequisite movies, reject circular dependencies, and calculate a prerequisite-first rewatch checklist. Rewatch output includes how many prerequisites are watched and the total remaining runtime for unwatched prerequisites.

**Feature 2 — Cinema booking:** Register cinemas with distinct available seat-bundle sizes and find a combination using the fewest bundles that seats a party **exactly** (or report that no exact combination exists). Both the graph operations and the unbounded coin-change optimization are implemented directly in TypeScript, with no external graph or solver libraries.

```text
doomsday-ready/
├── backend/              # Node 20, Express, TypeScript, Kysely, Vitest
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/             # React, TypeScript, Vite, Nginx for production
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── docker-compose.yml
└── README.md
```

## Quick Start

### Option A — Docker Compose (recommended for evaluation)

Requirements: Docker Engine/Desktop with the Compose v2 plugin.

From the repository root:

```bash
docker compose up --build
```

Open **http://localhost:3001**. The command starts PostgreSQL, waits until it is healthy, initializes the schema and seeds eight MCU movies if the movie table is empty, runs Express on the internal `backend:3000` service, and serves the built frontend through Nginx on port 80 (published as host port 3001). Nginx proxies `/api/*` to `http://backend:3000` without stripping `/api`.

Stop with `Ctrl+C`, or from another terminal run:

```bash
docker compose down
```

PostgreSQL data persists in the `postgres_data` named volume. To intentionally remove **all** local database data and reseed on next start, use `docker compose down -v` (destructive). The example database password in `docker-compose.yml` is for **local evaluation only**; replace it with securely managed credentials before any public deployment. The database and backend are not exposed on host ports by Compose.

### Option B — Local development

Requirements: Node.js 20+ and npm. SQLite works without running PostgreSQL.

**Terminal 1 — backend** (from repository root):

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

On Windows PowerShell, replace `cp .env.example .env` with `Copy-Item .env.example .env`. By default, Express listens on **http://localhost:3000**. The API creates the database tables automatically. The SQLite database path defaults to `./data/doomsday.sqlite` (as configured in `backend/src/db.ts`), and `DATABASE_PROVIDER=sqlite` is the default. To use a local PostgreSQL server instead, create a database and set `DATABASE_PROVIDER=postgres` and `DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/doomsday_ready` in `backend/.env`.

**Terminal 2 — frontend** (from repository root):

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the local backend's port. `frontend/vite.config.ts` reads the backend `PORT` setting from `backend/.env`, or you can override it with `BACKEND_PORT` / `BACKEND_URL` in `frontend/.env`.

**Run the tests** (in separate terminals, or sequentially):

```bash
cd backend
npm test
```

```bash
cd frontend
npm test
npm run build
```

The backend test suite uses an in-memory SQLite database. The frontend suite checks utility and API behavior. `npm run build` also type-checks the frontend. The backend can be type-checked/compiled with `cd backend && npm run build`.

## Data Model Diagram (Bonus)

The SQL schema is defined by `backend/src/db.ts` and has **four tables**. Although the cinema API exposes `bundleSizes` as an array, the database normalizes it into `cinema_bundle_sizes`; prerequisite references are likewise kept in a join table. IDs are UUID **strings** stored as `varchar(36)`.

```mermaid
erDiagram
    movies {
        string id PK
        string title UK
        int release_year
        int runtime_minutes
        int watched
    }
    movie_prerequisites {
        string movie_id PK,FK
        string prerequisite_id PK,FK
        int position
    }
    cinemas {
        string id PK
        string name UK
    }
    cinema_bundle_sizes {
        string cinema_id PK,FK
        int bundle_size PK
    }

    movies ||--o{ movie_prerequisites : "depends_on_as_movie_id"
    movies ||--o{ movie_prerequisites : "referenced_as_prerequisite_id"
    cinemas ||--o{ cinema_bundle_sizes : "offers"
```

`movie_prerequisites(movie_id, prerequisite_id)` is a composite primary key with **two** foreign keys to `movies(id)` (both cascade on delete), and `position` preserves the prerequisite order supplied to the API. `cinema_bundle_sizes(cinema_id, bundle_size)` is a composite primary key with `cinema_id` referencing `cinemas(id)` (cascade on delete). Movie titles and cinema names are each unique. Runtime is checked as 1–300 minutes, watched is stored as integer 0/1 with a check constraint, and bundle size is checked as 1–500. The API additionally validates the number of bundle sizes (1–10), uniqueness, and group size (1–10,000).

## API Reference

Base URL for local backend development: `http://localhost:3000`. When using Docker Compose, send requests to `http://localhost:3001/api/...` so they pass through Nginx. All requests and responses use JSON. Movie/cinema IDs below are **illustrative UUIDs**; the actual seed script generates IDs at runtime.

For the examples, use these example IDs:
- `11111111-1111-4111-8111-111111111111` — Sample Film
- `22222222-2222-4222-8222-222222222222` — Sample Sequel
- `33333333-3333-4333-8333-333333333333` — Downtown Cinema

### 1. `POST /api/movies` — Create a movie

**Request** (both `watched` and `prerequisites` are optional):

```json
{"title":"Sample Film","releaseYear":2026,"runtimeMinutes":120,"prerequisites":[]}
```

**Response `201 Created`:**

```json
{"id":"11111111-1111-4111-8111-111111111111","title":"Sample Film","releaseYear":2026,"runtimeMinutes":120,"watched":false,"prerequisites":[]}
```

### 2. `GET /api/movies` — List movies including prerequisite UUIDs

**Request:** `GET /api/movies` (no body).

**Response `200 OK`** (illustrative excerpt):

```json
[
  {"id":"11111111-1111-4111-8111-111111111111","title":"Sample Film","releaseYear":2026,"runtimeMinutes":120,"watched":false,"prerequisites":[]},
  {"id":"22222222-2222-4222-8222-222222222222","title":"Sample Sequel","releaseYear":2027,"runtimeMinutes":140,"watched":false,"prerequisites":["11111111-1111-4111-8111-111111111111"]}
]
```

### 3. `PATCH /api/movies/:id` — Update movie fields

**Request:** `PATCH /api/movies/11111111-1111-4111-8111-111111111111`

```json
{"watched":true}
```

**Response `200 OK`:**

```json
{"id":"11111111-1111-4111-8111-111111111111","title":"Sample Film","releaseYear":2026,"runtimeMinutes":120,"watched":true,"prerequisites":[]}
```

You may send any nonempty subset of `title`, `releaseYear`, `runtimeMinutes`, `watched`, `prerequisites`. Update prerequisites with an array of existing movie UUIDs; `[]` clears them. Self-dependencies and indirect cycles are rejected with **`409 CIRCULAR_DEPENDENCY`**:

```json
{"error":"CIRCULAR_DEPENDENCY","message":"Movie prerequisites would create a circular dependency"}
```

### 4. `GET /api/movies/:id/rewatch-order` — Prerequisite-first watch plan

**Request:** `GET /api/movies/22222222-2222-4222-8222-222222222222/rewatch-order`

**Response `200 OK`** (after marking Sample Film watched as above):

```json
{
  "targetMovieId":"22222222-2222-4222-8222-222222222222",
  "prerequisites":[
    {"id":"11111111-1111-4111-8111-111111111111","title":"Sample Film","releaseYear":2026,"runtimeMinutes":120,"watched":true,"prerequisites":[]}
  ],
  "watchedCount":1,
  "remainingRuntimeMinutes":0
}
```

Unlike `GET /api/movies`, this endpoint's `prerequisites` array contains **full movie objects**. It excludes the target movie, emits each transitive prerequisite only once, and places prerequisites before their dependents.

### 5. `POST /api/cinemas` — Create a cinema

**Request:**

```json
{"name":"Downtown Cinema","bundleSizes":[1,3,4]}
```

**Response `201 Created`:**

```json
{"id":"33333333-3333-4333-8333-333333333333","name":"Downtown Cinema","bundleSizes":[1,3,4]}
```

### 6. `GET /api/cinemas` — List cinemas with bundle sizes

**Request:** `GET /api/cinemas` (no body).

**Response `200 OK`:**

```json
[
  {"id":"33333333-3333-4333-8333-333333333333","name":"Downtown Cinema","bundleSizes":[1,3,4]}
]
```

The list is sorted by cinema name, and bundle sizes loaded from the database are sorted ascending.

### 7. `GET /api/cinemas/:id/booking?groupSize=6` — Quote exact-seat bundles

**Request:** `GET /api/cinemas/33333333-3333-4333-8333-333333333333/booking?groupSize=6`

**Response `200 OK`, possible:**

```json
{"possible":true,"totalBundles":2,"breakdown":[{"bundleSize":3,"count":2}]}
```

**Response `200 OK`, impossible** (for example, cinema bundles `[4,6]` with `groupSize=7`):

```json
{"possible":false,"message":"No exact bundle combination possible"}
```

The successful breakdown is sorted by **descending bundle size** and the sum of `bundleSize * count` equals `groupSize` exactly.

### Validation and error handling

- `400 VALIDATION_ERROR`: invalid JSON, malformed fields, invalid UUIDs, bad group size, or values outside allowed limits. Zod body-validation failures additionally return `details: [{"field":"...","message":"..."}]`.
- `400 INVALID_PREREQUISITE`: an otherwise valid prerequisite UUID does not match an existing movie.
- `404 NOT_FOUND`: movie, cinema, or endpoint does not exist.
- `409 CIRCULAR_DEPENDENCY`: a newly submitted movie-prerequisite graph contains a directed cycle.
- `409 DUPLICATE_TITLE`, `DUPLICATE_NAME`, or `DUPLICATE_VALUE`: uniqueness conflicts.

## Design Decisions & Assumptions

1. **UUIDs and normalized relationships.** Both movie and cinema IDs are generated as UUID strings. Movie-to-movie relationships use the `movie_prerequisites` join table, while cinema bundles use `cinema_bundle_sizes`, keeping the SQL schema normalized.
2. **Deterministic rewatch ordering.** A hand-written depth-first traversal walks each movie's prerequisite IDs in stored `position` order and emits a movie only after its prerequisites. This is a deterministic valid topological order for the current input, but it does **not** claim to be the only possible topological order. The target is excluded; previously watched prerequisites remain visible, while their runtimes do not count as remaining time.
3. **Preventing cycles.** A hand-written visiting/visited DFS checks the complete proposed dependency graph on both create and update. Edits take place in a database transaction; PostgreSQL also acquires an advisory transaction lock to serialize concurrent graph writes.
4. **Minimum-bundle selection and ties.** Unbounded dynamic programming considers bundle sizes from largest to smallest for every reachable seat total. Only a strictly better (fewer-bundle) solution replaces the current solution; when candidates tie at a DP state, the first candidate encountered (larger bundle first) is retained. Reconstruction follows those chosen sizes. This makes the result deterministic and minimizes bundle **count**, not necessarily seat waste (waste is disallowed).
5. **Two database engines.** SQLite is the local default requiring no database server, while `DATABASE_PROVIDER=postgres` plus `DATABASE_URL` runs the same Kysely models against PostgreSQL. Docker Compose uses PostgreSQL with a persistent volume; local development defaults to SQLite. Schema initialization occurs in both the seed CLI and API startup.
6. **Seed behavior.** `npm run seed` inserts the exact eight requested MCU movie titles and prerequisite edges **only if the movies table is empty**. It is safe to rerun without duplicates; seeding a partially populated movie table is intentionally skipped. Movie runtimes are demonstration values, not all sourced from the assessment. In particular, the 180-minute Avengers: Doomsday runtime is **illustrative**, not an official confirmed runtime.
7. **Transport and frontend.** The frontend uses same-origin `/api` calls. Vite proxies those in development; production Nginx preserves `/api` when forwarding to Express. The backend is not separately published to the host in Docker Compose.
8. **Limits.** Movie runtime: 1–300 minutes. Cinema bundle sizes: 1–10 unique integers in the range 1–500. Group size: 1–10,000. Unreachable exact group sizes return `possible: false`, not an HTTP error.

## AI Tools Usage Disclosure

**ChatGPT (OpenAI) was used during development** to assist with designing the project layout, scaffolding Express/TypeScript and React/Vite boilerplate, suggesting API validation and error-handling patterns, generating algorithm unit tests and frontend/API test scaffolding, drafting documentation, and configuring Docker Compose and Nginx.

The **Feature 1 cycle-detection and topological-order algorithms** and **Feature 2 unbounded dynamic-programming bundle optimizer** are application-level implementations written from scratch in **pure TypeScript**, without an external graph, topological sorting, coin-change, or optimization library. The algorithm logic was reviewed against the assessment requirements and **verified locally with a direct TypeScript compilation and smoke checks** covering three rewatch scenarios (including the seven-film Doomsday plan), indirect cycle detection, and the four required bundle quotes. Before claiming full application verification, the submitter should also run `npm test` in both projects, build the frontend, and run `docker compose up --build` on their machine. A complete Vitest and containerized integration run has **not** been independently confirmed in this document.

This disclosure describes AI assistance transparently; it does not imply that all source code was authored without AI assistance or that tests not actually executed were completed.
