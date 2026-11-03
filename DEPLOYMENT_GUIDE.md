# Deployment guide

Deploy four independently scaled services: static frontend, core backend, AI service, and remote-sensing service, plus managed PostgreSQL. Use HTTPS and distinct production secrets. Do not ship `.env`, Hardhat accounts, or generated Prisma/Hardhat artifacts.

1. Provision PostgreSQL 16, apply `backend/prisma/migrations`, and configure `DATABASE_URL`.
2. Deploy the AI and imagery containers with private network ingress; point `AI_SERVICE_URL` and `REMOTE_SENSING_SERVICE_URL` at their internal service DNS names.
3. Deploy backend with `JWT_SECRET`, a precise `FRONTEND_ORIGIN`, restrictive network rules, and health checks at `/api/v1/health`.
4. Build frontend with `VITE_USE_MOCK_API=false` and its public API origin. No secret belongs in a `VITE_` variable.
5. Optionally deploy a reviewed chain adapter. Configure RPC, registry address and an operator-controlled signing mechanism; do not use a raw private key in a public CI pipeline.

Run migrations before rolling new backend replicas; retain imagery only as long as needed. Monitor health endpoints, timeout/error rates, database connections and upload rejection rates. The bundled Compose file is for local development, not a production security baseline.
