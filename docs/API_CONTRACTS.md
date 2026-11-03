# Co-opGig API v1 contract

Base path `/api/v1`. All IDs are UUID strings; timestamps are UTC ISO-8601. Success envelope `{data, requestId?}`; error envelope `{error:{code,message,details},requestId?}`.

## Shared domain
Roles: `CUSTOMER`, `WORKER`, `ADMIN`. Categories: `electrician`, `plumber`, `carpenter`, `painter`, `cleaner`, `gardener`, `driver`, `caregiver`, `technician`, `domestic-helper`, `mason`, `appliance-repair`. Verification: `PENDING`, `VERIFIED`, `REJECTED`. Job status: `OPEN`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CUSTOMER_CONFIRMED`, `CANCELLED`.

## Core routes
- `GET /health` → `{data:{service,version,status,database}}`
- `POST /auth/register` body `{name,email,password,role?,workerProfile?}`; worker profile fields `{displayName,serviceCategories,serviceAreaText,latitude?,longitude?}`. Worker profiles begin `PENDING`, `UNAVAILABLE`.
- `POST /auth/login` body `{email,password}`; sets HttpOnly cookie.
- `GET /auth/me`; `POST /auth/logout`.
- `GET /services/categories` → canonical slug/label list.
- `GET /workers?category=&lat=&lng=&available=true|false`; `GET /workers/:workerId`.
- `POST /jobs` body `{description,category,categoryConfidence?,locationText,latitude?,longitude?,urgency?}`.
- `GET /jobs/mine`; `GET /jobs/:jobId`.
- `POST /jobs/:jobId/accept` (available worker, exact category match).
- `PATCH /jobs/:jobId/status` body `{status:"IN_PROGRESS"|"COMPLETED"|"CANCELLED"}`.
- `POST /jobs/:jobId/confirm-completion` (customer only, after COMPLETED).
- `POST /reviews` body `{jobId,rating,comment?}`.
- `POST /assistant/classify` body `{description,imageUrl?,locale?}`; proxies to AI `POST /api/v1/classify`.
- `POST /assistant/chat` body `{sessionId?,message,jobContext?,locale?}`; proxies to AI `POST /api/v1/chat`.
- `POST /demand/estimate` body `{analysisId,areaId?,features?}`; admin-only proxy to remote-sensing `POST /api/v1/demand/estimate`.
- `GET /blockchain/jobs/:jobId` (job owner/assignee/admin only).

Assistant and demand responses preserve upstream `data` payload inside the standard outer response envelope. Upstream errors/timeouts return HTTP 503 with standard error envelope. Remote sensing is area-level analysis only, not diagnosis of an individual household fault.

## Lifecycle
`OPEN -> ACCEPTED -> IN_PROGRESS -> COMPLETED -> CUSTOMER_CONFIRMED`. Cancellation allowed from `ACCEPTED` or `IN_PROGRESS`; customer/admin/assigned worker can cancel. Only assigned worker advances work; only customer (or admin override) confirms completion. Blockchain confirmation is supplementary audit evidence and never substitutes for application-side confirmation.

## Error codes
`VALIDATION_ERROR`, `UNAUTHENTICATED`, `INVALID_TOKEN`, `FORBIDDEN`, `NOT_FOUND`, `EMAIL_EXISTS`, `INVALID_CREDENTIALS`, `INVALID_TRANSITION`, `NOT_ELIGIBLE`, `INTERNAL_ERROR`, `AI_UNAVAILABLE`, `REMOTE_SENSING_UNAVAILABLE`.
