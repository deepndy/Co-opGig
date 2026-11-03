# Integration report

## Initial audit

| Module | Expected | Actual | Findings |
| --- | --- | --- | --- |
| Frontend | React portal and one chat bubble | React 19/Vite with a single root-mounted widget, HTTP/mock adapter and tests | Connected adapter existed; backend open-job feed and urgency mismatch needed adapters. |
| AI | FastAPI chat/classifier fallback | FastAPI TF-IDF/keyword baseline with in-memory sessions and safety wording | Contract-aligned; no paid LLM dependency. Python runtime was unavailable for execution here. |
| Remote sensing | image pair/change/demand API | FastAPI CPU pixel-difference baseline, multipart validation, results store and heuristic demand rules | Required core proxy routes were missing; added. Archive contained cache/bytecode artifacts, excluded from final. |
| Backend | Express/Prisma central API | Express 5, Argon2, JWT cookie, RBAC, Prisma migration, proxies | Initial schema enums and source literal `\\n` prevented build; repaired. Added worker feed, imagery proxy, upload limits, preferred-worker validation, and urgency adapter. |
| Blockchain | Solidity/Hardhat registry | Hash-only registry with lifecycle tests | Original toolbox/Hardhat pins conflicted; updated Hardhat 2.26.3 to 2.28.0. |

## Changes made

- Preserved all modules under the requested top-level layout and added root deployment/docs assets.
- Corrected backend Prisma syntax, malformed newline in source/migration, ethers `Contract` constructor order, route parameter typing, and Docker build dependency workflow.
- Added `GET /jobs?status=OPEN` for worker dashboard integration.
- Added authenticated admin imagery analysis/result proxy routes, 10 MB image restrictions, and clear upstream failure handling.
- Added optional `preferredWorkerId`; selection is visible in booking and is validated against availability/category, but remains OPEN until worker acceptance.
- Added Compose health checks and service-name URLs.

## Test evidence

| Command | Result |
| --- | --- |
| `backend: npx prisma generate; npm run build; npm test` | passed; 5 tests |
| `frontend: npm run build; npm test` | passed; 15 tests |
| `blockchain: npm run compile; npm test` | passed; 3 tests |
| Python service tests | not run: Python launcher inaccessible |
| Docker Compose/full database workflows | not run: Docker unavailable |

No claim is made that unexecuted end-to-end workflows passed. See `KNOWN_ISSUES.md` for the remaining verification work.

## Failure-path coverage and expected behaviour

| Scenario | Implemented response | Execution status |
| --- | --- | --- |
| Invalid login / registration / category | Zod validation and Argon2 login checks return standard 400/401 envelopes | database-backed path not executed |
| Unauthenticated or unauthorised job access | cookie/Bearer middleware and ownership/RBAC return 401/403 | unit-level auth source inspected; database path not executed |
| AI unavailable | backend returns 503 `AI_UNAVAILABLE`; booking still permits a manual category | not executed without Python runtime |
| Remote service unavailable | proxy returns 503 `REMOTE_SENSING_UNAVAILABLE`; booking stays available | not executed without Docker |
| Invalid or oversized image | multer accepts only PNG/JPEG/WEBP and 10 MB files; remote service revalidates image bytes/dimensions | not executed without Python runtime |
| Database unavailable | health is `degraded`; database-dependent calls return safe generic error | not executed without PostgreSQL/Docker |
| Blockchain unavailable | core job/database write continues; chain route reports unavailable | adapter source and contract tests executed separately; no RPC integration run |

The list is intentionally a verification checklist, not evidence that the unavailable full-stack scenarios passed.
