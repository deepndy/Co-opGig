# Co-opGig

Co-opGig is a student-project prototype for cooperative/local skilled-worker discovery. It integrates Deep Lokhande's React portal, Shravan Ganjare's offline FastAPI assistant, Mansi Phalke's CPU-only imagery analysis, and Shreya Burse's Express/Prisma/Hardhat core.

It is not a payment, emergency-response, worker-verification, or production-audited system. The assistant only suggests categories; it never creates a job. Aerial imagery produces experimental **area-level potential demand**, never a diagnosis of a household fault.

## Architecture

`frontend -> core backend -> PostgreSQL / AI service / remote-sensing service / optional local Hardhat registry`

The browser calls only the core backend. Service keys and blockchain signing material stay server-side. The React shell mounts exactly one floating assistant widget.

## Repository layout

- `frontend/` React 19 + Vite portal.
- `backend/` Express 5, Prisma, PostgreSQL API and service proxies.
- `ai-service/` FastAPI offline TF-IDF/keyword classifier and guided chat.
- `remote-sensing-service/` FastAPI image-pair change analysis and heuristic demand estimation.
- `blockchain/` Solidity/Hardhat opaque job and credential registry.
- `infra/docker-compose.yml` local stack.
- `docs/` architecture, API, schema, blockchain, and integration evidence.

## Run the full local stack

Prerequisites: Docker Compose, Node 22+ (only for optional local development), and a copied environment file.

```powershell
Copy-Item .env.example .env
# Edit .env and set unique POSTGRES_PASSWORD and JWT_SECRET values.
docker compose -f infra/docker-compose.yml up --build
```

Open `http://localhost:8080`; API health is `http://localhost:4000/api/v1/health`. Stop with `docker compose -f infra/docker-compose.yml down`. Add `-v` only when intentionally deleting the local database.

The backend container applies the committed Prisma migration on startup. Seed synthetic demo records only when needed:

```powershell
docker compose -f infra/docker-compose.yml exec backend npm run db:seed
```

## Local development without Docker

Start PostgreSQL, then in separate terminals run `npm install`, `npx prisma generate`, `npx prisma migrate deploy`, and `npm run dev` in `backend`; create Python virtual environments and `pip install -r requirements.txt` in each Python service; and run `npm ci; npm run dev` in `frontend` with `VITE_USE_MOCK_API=false` and `VITE_API_BASE_URL=http://localhost:4000`.

## Local blockchain demo

The compose stack deliberately starts without a signer or deployed contract. In two terminals:

```powershell
cd blockchain; npm ci; npm run node
# separate terminal
cd blockchain; npm run deploy:local
```

Set the emitted contract address and a disposable Hardhat account private key in `.env`, then restart `backend`. Never use a funded or production private key. The contract contains hashes, opaque references, and status codes only.

## Tests actually run in this integration environment

- `backend`: `npx prisma generate`, `npm run build`, `npm test` — passed (5 tests).
- `frontend`: `npm run build`, `npm test` — passed (15 tests).
- `blockchain`: `npm run compile`, `npm test` — passed (3 tests).

Docker and Python service tests were not run here because Docker is absent and the available Python launcher is inaccessible. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) and [docs/INTEGRATION_REPORT.md](docs/INTEGRATION_REPORT.md).

## Documentation

See [system architecture](docs/SYSTEM_ARCHITECTURE.md), [API documentation](docs/API_DOCUMENTATION.md), [database schema](docs/DATABASE_SCHEMA.md), [blockchain documentation](docs/BLOCKCHAIN_DOCUMENTATION.md), and [deployment guide](DEPLOYMENT_GUIDE.md).
