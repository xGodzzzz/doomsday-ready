# Doomsday Ready — React Frontend

Responsive React 19 + TypeScript + Vite interface for the existing Doomsday Ready Express API. No fake data or placeholders: all three views call the real backend.

## Repository layout

```text
doomsday-ready/
├── backend/    # Extract the previously supplied backend project here
└── frontend/   # This project (the directory inside the downloadable ZIP)
```

Do not put `frontend/` *inside* `backend/`. The two folders are siblings.

## Requirements

- Node.js 20+
- npm
- The previously supplied backend running on port 3000 by default

## Run locally

From a terminal in `backend/`:

```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

From a **second terminal**, in `frontend/`:

```bash
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` requests to the backend at `http://127.0.0.1:3000` by default. Vite reads `PORT` from `../backend/.env` automatically when present, so if you change the backend port there, it will follow. You can override by creating `frontend/.env` containing `BACKEND_PORT=4000` or `BACKEND_URL=http://127.0.0.1:4000`. Restart Vite after editing environment settings.

### Other scripts

```bash
npm run build      # TypeScript type check + optimized production build in dist/
npm run preview    # Preview that build
npm run typecheck  # TypeScript check without bundling
npm test           # Vitest API-contract and input-validation tests
```

Production builds write static HTML, CSS, and JavaScript to `dist/`. For production deploys, serve the build and forward `/api` to your Express server (Vite's proxy applies to `npm run dev`, not to a production static host).

## Views

**Movies:** `POST /api/movies`, `GET /api/movies`, `PATCH /api/movies/:id`. Add title, year, runtime (1–300), and UUID prerequisites using checkboxes. Search titles, toggle watched status, and edit prerequisite edges directly. Displays backend's `400 VALIDATION_ERROR` details and `409 CIRCULAR_DEPENDENCY` errors.

**Rewatch plan:** `GET /api/movies/:id/rewatch-order`, `PATCH /api/movies/:id`. Defaults to Avengers: Doomsday if seeded. Displays ordered full prerequisite movie objects, watched count, progress, and remaining runtime. Checklist updates optimistically and then refreshes from the backend after PATCH. The target movie itself is excluded by the API.

**Watch party:** `POST /api/cinemas`, `GET /api/cinemas`, `GET /api/cinemas/:id/booking?groupSize=6`. Validates unique integer seat bundle sizes (1–10 sizes, each 1–500), validates group size 1–10,000, and displays exact-minimum bundle breakdown or an impossible result.

## Exact API contracts

`Movie` and `Cinema` IDs are strings (UUIDs). In movie records returned by `/api/movies`, `prerequisites` is a `string[]` of IDs. For `/api/movies/:id/rewatch-order`, the `prerequisites` property is a `Movie[]` of full objects. These are intentionally different contracts and are represented by separate TypeScript types in `src/api.ts`.

Create movie body:

```json
{"title":"New Movie","releaseYear":2027,"runtimeMinutes":120,"prerequisites":[]}
```

Patch movie watched status:

```json
{"watched":true}
```

Patch prerequisite edges:

```json
{"prerequisites":["00000000-0000-4000-8000-000000000001"]}
```

(The UUID in this last **example** illustrates the JSON value type; actual requests always send IDs selected from existing movie records.)

Create cinema body:

```json
{"name":"Downtown Cinema","bundleSizes":[1,3,4]}
```

Booking success:

```json
{"possible":true,"totalBundles":2,"breakdown":[{"bundleSize":3,"count":2}]}
```

Booking impossible:

```json
{"possible":false,"message":"No exact bundle combination possible"}
```

## Structure

```text
frontend/
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── README.md
└── src/
    ├── api.ts
    ├── App.tsx
    ├── main.tsx
    ├── styles.css
    ├── utils.ts
    ├── components/
    │   ├── Feedback.tsx
    │   └── Icons.tsx
    ├── views/
    │   ├── MoviesView.tsx
    │   ├── RewatchView.tsx
    │   └── BookingView.tsx
    └── tests/
        ├── api.test.ts
        └── utils.test.ts
```

The core backend graph/booking algorithms remain in `backend/src/algorithms/`; the frontend does not duplicate them or silently calculate a different quote.
