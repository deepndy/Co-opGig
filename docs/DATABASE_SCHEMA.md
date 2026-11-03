# Database schema

PostgreSQL is the central source of truth. Prisma schema and reproducible SQL migration live in `backend/prisma/`.

| Table | Purpose |
| --- | --- |
| `User` | account, role, Argon2 password hash |
| `WorkerProfile` | categories, locality/coordinates, availability, verification state |
| `WorkerCredential` | off-chain credential reference/hash and review state |
| `Job` | customer request, category, location, urgency, lifecycle, optional preferred/assigned worker |
| `JobEvent` | lifecycle audit event and actor |
| `Review` | one customer review per confirmed job |
| `BlockchainTransaction` | best-effort chain transaction metadata linked to job |

The migration adds `preferredWorkerId` as a nullable indexed UUID field. It is intentionally not an assignment and carries no relation that would permit bypassing lifecycle checks. Personal data and raw certificates remain off-chain.

Apply from `backend/` with `npx prisma generate` then `npx prisma migrate deploy`; synthetic seed data uses `npm run db:seed` and must be treated as demo data.
