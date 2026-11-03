# Cross-service test plan

Run these against the Compose stack before release: customer registration/booking; assistant handoff to booking; worker open-feed acceptance and lifecycle; local Hardhat transaction retrieval; two-image imagery analysis plus demand estimate; and failure responses for invalid credentials, validation errors, unavailable dependencies, invalid/oversized uploads, and unauthorised job access.

The integration environment could not run this stack because Docker and Python were unavailable. The executed module-level test evidence is recorded in `docs/INTEGRATION_REPORT.md`.
