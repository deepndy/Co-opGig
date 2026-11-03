# Co-opGig Frontend

React + TypeScript + Vite implementation of the Co-opGig customer and worker experience, plus the single floating AI assistant bubble.

> This is the frontend module (Deep Lokhande's task). It contains no backend, database, AI model, remote-sensing model or Solidity contract.

## Quick start

Requires Node.js 22.12+ (Node 24 used for verification) and npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

`VITE_USE_MOCK_API=true` is the default: the app runs with clearly labelled synthetic browser data and no backend. Open the printed local URL (default `http://127.0.0.1:5173`).

To use the shared core backend:

```bash
# .env
VITE_API_BASE_URL=http://localhost:4000
VITE_USE_MOCK_API=false
```

The base URL must be the API origin only (no `/api/v1` suffix). The typed client appends `/api/v1/...`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server on `127.0.0.1:5173` |
| `npm run typecheck` | Strict TypeScript check |
| `npm test` | Vitest + Testing Library test suite |
| `npm run test:watch` | Watch mode |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Preview the built SPA on `127.0.0.1:4173` |

## Routes

| Route | Screen | Access |
| --- | --- | --- |
| `/` | Landing page | Public |
| `/services` | Service catalog and search | Public |
| `/book` | Three-step booking with explicit confirmation | Public in demo; signed-in in API mode |
| `/login` | Sign in / register with role selector | Public |
| `/customer` | Customer request dashboard | `CUSTOMER` or `ADMIN` |
| `/worker` | Worker profile, incoming and assigned jobs | `WORKER` or `ADMIN` |
| `/how-it-works` | Workflow, safety boundaries and prototype status | Public |
| `/about` | Cooperative model and team | Public |
| `*` | Not found | Public |

## Demo mode

The demo adapter is selected by `VITE_USE_MOCK_API`. It is never silent:

- A persistent amber banner states that the backend is not connected.
- Worker cards read **Demo profile**; ratings read **Demo rating**.
- Earnings in the marketing preview are labelled fictional demo data.
- Bookings, job actions and sign-in are stored in this browser only.
- The assistant replies are labelled as keyword demos, not an AI model.

Demo sign-in buttons on `/login` create local personas. Any 6+ character password works in demo mode; never use a real password. Clear site storage to reset synthetic jobs.

Demo browser storage:

| Key | Storage | Contents |
| --- | --- | --- |
| `coopgig.demoSession` | localStorage | Demo persona; not a real session |
| `coopgig.mockJobs.v1` | localStorage | Synthetic job records |
| `coopgig.authToken` | localStorage | Bearer token in API mode only (optional; cookie sessions are supported) |
| `coopgig.assistant.sessionId` | sessionStorage | Assistant conversation ID only |

## Structure

```text
src/
├── api/            # Typed API surface, fetch wrapper, normalizers, mock adapter
├── auth/           # Auth provider and role guard
├── components/     # Layout, UI, services, workers, jobs, assistant, home sections
├── config/         # Brand copy, canonical categories, env
├── hooks/          # Async data loading
├── pages/          # One component per route
├── styles/         # Design tokens and component/page styles
├── test/           # Vitest setup
├── types/          # Shared domain and API types
└── utils/          # Formatting and class helpers
```

The brand name and shared disclaimers live in `src/config/brand.ts`. Canonical service slugs live in `src/config/serviceCategories.ts`.

## The single assistant bubble

`AssistantWidget` is mounted once in `App.tsx`, outside the route tree. It calls only `POST /api/v1/assistant/chat` (through the core backend) and stores only the session ID. It never creates or changes a job; its handoff button opens `/book` with draft values for explicit review.

## API documentation

- Contract assumptions and endpoint mapping: `../INTEGRATION_NOTES.md`
- Complete file list: `../FILE_MANIFEST.md`
- Module overview: `../README.md`

## Tests

`npm test` currently runs 6 test files / 15 tests covering the API envelope and errors, the demo assistant's safety and sessions, verification labelling, the booking confirmation gate, and the single assistant bubble across navigation. See the root README for recorded results.

## Deployment

`Dockerfile` builds the static app and serves it with Nginx, including SPA fallback and basic security headers.

```bash
docker build -t coopgig-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.org \
  --build-arg VITE_USE_MOCK_API=false \
  .
docker run --rm -p 8080:80 coopgig-frontend
```

Production requires HTTPS, a narrowly configured CORS origin on the backend, and secrets kept in the backend environment. Do not place API keys in this frontend.
