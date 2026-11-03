# Known issues and limits

- Docker Compose and the Python test suites were not executable in the integration environment; run them before public deployment.
- The remote-sensing result is a CPU-only pixel-change baseline. It is experimental, requires co-registered imagery, and returns no calibrated confidence.
- A selected worker is a stored preference, not an assignment. A matching available worker must still accept the OPEN job.
- Worker verification review, credential upload, messaging, payments, escrow, and real dispatch are outside this prototype.
- Blockchain writes are best-effort supplementary audit records. Core job persistence remains available if the local chain is unavailable.
- The local Hardhat service is a development demonstration only. Contract/operator setup and secure key custody are required for any deployment.
- The frontend has labelled browser mock mode for standalone UI development. Set `VITE_USE_MOCK_API=false` for connected operation.
