# Verification record

Checked September 24, 2026. This records implementation checks, not a guarantee of profitable or loss-free trading.

## Completed

- All 71 backend tests pass, including disposable real MySQL persistence, rollback, unique cycle slots, execution-lock ownership, shutdown blocking, authenticated HTTP access, and order recovery. Existing PostgreSQL tests also pass.
- The domain/application coverage gate passes at 97.30% (396 of 407 statements). Infrastructure is checked separately through integration tests.
- All 46 frontend tests pass. The production frontend build succeeds.
- Ruff, mypy, the role-based hexagonal boundary checker, and the Tach import graph pass. All repository pre-commit hooks pass; their always-run settings remain enabled.
- `npm audit` reports zero vulnerabilities. `pip-audit` reports no known vulnerabilities in the installed Python dependencies; it skips the local, unpublished backend package. Existing vulnerable development dependencies were upgraded and lockfiles updated.
- The Docker image builds and runs as a non-root user. A disposable Compose deployment starts MySQL, initializes the schema, and serves the terminal with security headers. This startup test uses blank provider credentials and reports unconfigured; it submits no orders.
- Browser checks against an authenticated local fixture with real MySQL verified unlocking, pausing/resuming, decision history, order filtering, the 60-candle chart, and mobile layout without horizontal overflow. No browser console errors were observed. Fixture data was explicitly labeled synthetic.
- A read-only public Coinbase product response was checked against the mapper, including actual lowercase `cde` venue values and blank product status. The inspected BTC contract's minimum notional exceeded the requested $5/$10 notional cap and its overnight margin did not permit the requested 5x policy.

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
