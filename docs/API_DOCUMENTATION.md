# API documentation

All core endpoints use `/api/v1`, JSON success `{ "data": ... }`, and errors `{ "error": { "code", "message", "details" } }`. IDs are UUID strings and timestamps are UTC ISO-8601.

## Public/authenticated core API

| Route | Role | Purpose |
| --- | --- | --- |
| `GET /health` | public | database-aware health |
| `POST /auth/register`, `/auth/login`, `/auth/logout` | public | cookie session lifecycle |
| `GET /auth/me` | authenticated | current account |
| `GET /services/categories`, `GET /workers` | public | canonical categories and ranked workers |
| `POST /jobs` | customer/admin | create OPEN job; optional `preferredWorkerId` is a preference only |
| `GET /jobs?status=OPEN` | worker/admin | open worker feed |
| `GET /jobs/mine`, `GET /jobs/:jobId` | authenticated owner | job retrieval |
| `POST /jobs/:jobId/accept` | worker | accept matching available OPEN job |
| `PATCH /jobs/:jobId/status` | assigned worker | `IN_PROGRESS`, `COMPLETED`, or authorised `CANCELLED` |
| `POST /jobs/:jobId/confirm-completion` | customer/admin | confirms a completed job |
| `POST /reviews` | customer | one review after confirmation |

`POST /assistant/chat` and `POST /assistant/classify` are authenticated proxies to the AI service. They return a suggestion/clarification only and cannot create jobs.

`POST /demand/estimate`, `POST /demand/imagery/change-detection` (multipart `imageT1`, `imageT2`), and `GET /demand/imagery/analysis/:analysisId` are admin-only proxies. Images are PNG/JPEG/WEBP, maximum 10 MB each. Their results are area-level experimental indicators, not household diagnoses.

`GET /blockchain/jobs/:jobId` returns off-chain transaction metadata and current registry data when the chain is configured.

## Compatibility adapters

The frontend sends urgency `normal`, `urgent`, or `emergency`; the backend maps these to its persisted `NORMAL`, `HIGH`, and `URGENT` values, and maps them back for UI display. AI `high` urgency is accepted as frontend `urgent`. This corrects a supplied-module mismatch without changing the database enum.
