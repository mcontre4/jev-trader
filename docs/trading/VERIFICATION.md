# Verification record

Checked October 15, 2026 for the open-source release. This records implementation checks, not a guarantee of profitable or loss-free trading.

## Completed

- All 71 backend tests pass, including disposable real MySQL persistence, rollback, unique cycle slots, execution-lock ownership, shutdown blocking, authenticated HTTP access, and order recovery. Existing PostgreSQL tests also pass. No production database was used.
- The domain/application coverage gate passes at 97.30% (396 of 407 statements). Infrastructure is checked separately through integration tests.
- All 46 frontend tests pass. The production frontend build succeeds.
- Ruff, mypy, the role-based hexagonal boundary checker, and the Tach import graph pass. All repository pre-commit hooks pass; their always-run settings remain enabled.
- `npm audit` reports zero vulnerabilities. `pip-audit` of the installed backend environment reports no known vulnerabilities after compatible dependency updates. The local pip tool was also updated; Docker already installs pip >=26.2. These are advisory checks, not proof that dependencies are vulnerability-free.
- Gitleaks 8.30.1 found no secrets in the release files or reachable local Git history. Its only code false positive was the public `ec.SECP256R1` curve constant, with a documented, single-line annotation. No real credentials were found or copied. No `.env` file was present. This does not establish that credentials were never exposed outside the repository.
- Generated coverage data was removed from the tracked tree. Environment files, private-key formats, database dumps, logs, and local recovery notes are excluded from future commits and the Docker build context. Existing Git history was retained because the scans found no credentials requiring a rewrite.
- The production Docker image builds and runs as user `trader`. A separate local container with no provider credentials serves the built terminal, reports `configured: false`, sets security headers, and rejects protected terminal access with 503. The Compose configuration validates with placeholder environment values. A full configured Compose deployment was not exercised in this release check.
- The two README screenshots were captured from the production UI with intercepted synthetic API responses. Unlocking, the 60-candle chart, paused preview state, decision journal, and inspector rendered without browser errors. These screenshots do not exercise live provider or database integration; see `docs/screenshots/README.md`.
- GitHub CI runs backend tests, the 95% coverage gate, Ruff, mypy, architecture checks, frontend tests/build, and a full-history secret scan. CI actions and the scanner image are pinned. Gitleaks also runs in pre-commit; all existing always-run hooks remain enabled.

## Safety properties reviewed

- Credentials stay server-side. The terminal requires a bearer token, stores it only in browser memory, and binds to localhost by default. Host validation, cache prevention, a content security policy, and sanitized errors are enabled. The legacy user-registration endpoint is not mounted.
- Domain and application layers use injected ports, immutable values, explicit request/response DTOs, and deterministic sizing. Model text cannot select API endpoints, change risk limits, or submit arbitrary order arguments.
- Stale/incomplete candles, non-finite values, insufficient margin, unsupported leverage, excessive fees, incompatible products, exposure limits, and preview warnings fail closed. Actual exchange fills are distinguished from order acknowledgments.
- A durable intent precedes submission. Ambiguous outcomes block new orders until reconciled. No automatic order POST retries occur, and no network calls run inside a database transaction.
- The MySQL execution lock excludes a second worker using the same database. Shutdown is checked before submission. Pause and shutdown cannot retract an already in-flight request or close an existing position.

## Requires real credentials and account verification

Coinbase/Jev private API contract tests use injected HTTP fixtures. Actual private-account authentication, CFM eligibility, preview acceptance, fees, leverage, fills, and Jev responses have **not** been verified with live credentials. No real order was sent.

BTC and US CFM are provisional defaults. International derivatives are not implemented. Coinbase sets contract minimums and margin requirements; the software cannot make an unsupported $1-at-5x order possible. It blocks such an order without increasing the budget. Follow the setup guide's preview workflow before enabling live mode.

There is no protective stop-loss, automatic rollover, or liquidation prevention. The daily loss/exposure gates limit new actions but do not cap losses on existing positions. Manual trades, other installations using a separate database, exchange outages, and changing margin requirements remain operational risks. This is a focused code and dependency review, not an external penetration test or a full container operating-system vulnerability scan.
