# System architecture

The React frontend is the only public UI. It uses cookie-based authentication with the Express core API and mounts one `AssistantWidget` at the application shell. It does not call either Python service directly and never contains an AI or blockchain secret.

The core API owns PostgreSQL records, role checks, job lifecycle validation, matching, and resilient proxy calls. AI failures return a structured 503; users can manually choose a category. Remote-sensing access is admin-only and similarly returns 503 rather than taking down booking.

```text
React frontend ──JSON/cookies──> Express API ──> PostgreSQL
                                     ├───────> FastAPI AI classifier/chat
                                     ├───────> FastAPI imagery analysis
                                     └───────> optional Hardhat registry
```

Canonical categories are `electrician`, `plumber`, `carpenter`, `painter`, `cleaner`, `gardener`, `driver`, `caregiver`, `technician`, `domestic-helper`, `mason`, and `appliance-repair`. Lifecycle values are `OPEN`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CUSTOMER_CONFIRMED`, and `CANCELLED`.

Matching is explainable: exact category is mandatory; availability, verification, distance when coordinates are present, and real stored ratings contribute to ranking. Customers can store a preferred available worker; this never bypasses worker acceptance.
