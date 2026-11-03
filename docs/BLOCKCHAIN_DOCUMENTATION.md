# Blockchain documentation

`CoopGigJobRegistry.sol` is a local-development audit registry, not escrow. It records only `bytes32` credential hashes, opaque job-reference hashes, agreement hashes, lifecycle enum values, timestamps, and event data. It does not receive names, addresses, phones, email, documents, photos, passwords, or payment data.

Allowed contract path: create job → accepted → in progress → completed → customer confirmed; cancellation is supported from accepted/in-progress. The backend hashes application identifiers before invocation and writes database records even if the optional chain call fails.

For a demo, start `npm run node`, deploy with `npm run deploy:local`, place the generated address and a disposable Hardhat signer in local `.env`, and grant that signer the contract operator role. The frontend never signs transactions. The integration environment compiled and executed all three contract tests successfully.
