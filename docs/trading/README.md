# Jev personal futures terminal

The trading backend is a separate `app.trading` bounded context. FastAPI serves a React terminal; a single worker evaluates every 30 seconds. MySQL stores full candle/account snapshots, typed Jev decisions, order intents and exchange execution results. No user registration, wallet funding or transfers are added.

## Start

1. Copy `.env.example` to `.env` at the repository root and fill the secrets. Generate a terminal token with `python3 -c 'import secrets; print(secrets.token_urlsafe(32))'`. Use URL-safe random database passwords, or percent-encode the password in `DATABASE_URL` for local development. Compose interpolation expects a URL-safe database password.
2. Create a Coinbase CDP **ECDSA / ES256** key for your own Advanced account, scoped to view and trade. Do not grant transfer permission. Add the key name and PEM private key to `.env`. Configure a TypeSafe API key as `JEV_API_KEY`.
3. Run `docker compose up --build`. Open `http://127.0.0.1:8000` and unlock with `TERMINAL_TOKEN`. This authenticates the terminal; the backend authenticates directly to your personal Coinbase account using the CDP key. There is no Coinbase OAuth or password form.
4. Leave `TRADING_MODE=preview` while checking account eligibility, product selection and limits. Preview calls the real APIs and consumes Jev usage, but never sends an order or invents a fill.
5. To enable actual orders, configure the desired `TRADING_ASSET`, pin the discovered `TRADING_PRODUCT_ID`, set `TRADING_CFM_CONFIRMED=true` and `TRADING_MODE=live`, then recreate the service: `docker compose up -d --force-recreate terminal`. Live startup refuses missing credentials or unconfirmed CFM eligibility.

Only localhost is published. Keep it that way; remote access requires a deliberately configured TLS/authentication deployment. The token stays in browser memory and is cleared on reload/Lock. API keys never reach the browser. API responses are not cached.

For local development:

```sh
poetry -C backend install
npm --prefix frontend ci
docker compose up -d mysql
poetry -C backend run python -m app.trading.composition --init-db
poetry -C backend run uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
# In a second terminal:
npm --prefix frontend run dev
```

The initial schema initializer is idempotent and does not drop data. It creates only `trading_cycles` and `trading_control`. Future schema changes need explicit migrations; `create_all` does not upgrade existing tables. Do not delete the MySQL volume when upgrading: pending order intents are required for recovery.

## Exact trading behavior

- Defaults are provisional **BTC / US CFM futures**. The account region and desired asset must be verified by the operator. International derivatives are not implemented: their documented API is in migration and has different eligibility, minimums and authentication. A product outside CDE / USD / the configured underlying is rejected. No spot orders are ever sent.
- Discovery chooses the smallest eligible contract (notional minimum), then earliest expiry, and pins it in that worker. Set a product ID before live use to avoid selecting a different expiry on restart. There is no automatic rollover; contracts within 24 hours of expiry are blocked and existing exposure must be managed on Coinbase.
- Fetch exactly 60 consecutive **closed** one-minute OHLCV bars for the futures contract. Missing, duplicate, stale, malformed or non-finite data blocks execution; candles are never fabricated or filled forward. Thinly traded futures may lack this complete history and remain blocked.
- Jev receives those bars, account margin/equity/P&L, signed position, current contract specifications, 5x target, sizing and risk limits. Its only options are `long`, `short`, `hold`. The recorded confidence and probabilities are model outputs, not measured trading accuracy or profitability.
- `long` buys a budget-sized futures increment; `short` sells one. An opposite direction reduces the position, capped to the current size; a single order never flips it. `hold` leaves all exposure unchanged. Repeated decisions can add exposure only up to the configured position limit.
- `$1` or `$2` means a **margin budget**, with at most `$5` or `$10` notional at 5x, plus a separate fee reserve (default $0.10). Round down to contract increments. Never round up, enlarge the budget or silently substitute an asset. US nano contracts will commonly exceed this budget, so **zero executed orders is an expected valid outcome**.
- **CFM leverage cannot simply be selected with `leverage=5`.** Require 20% overnight initial margin and a preview confirming 5x and an acceptable margin cost. Otherwise block. The UI distinguishes the requested target from the actual overnight margin rates. Intraday/overnight changes can block orders. Future exchange margin changes cannot be controlled by this software.
- Use a price-capped **fill-or-kill limit order**, with a mandatory Coinbase preview and bounded slippage. Contract/API availability of this order configuration is checked by preview; unsupported configurations block, with no market-order fallback. Acknowledged orders display pending, never filled, until the exchange reports actual execution quantity, average price and fees.
- Reject insufficient futures margin, preview warnings/errors/excess fees, low confidence, open futures orders and other futures positions. New exposure stops at the position limit or daily loss threshold (Coinbase daily realized P&L plus unrealized P&L). Reductions remain possible at the daily loss threshold.
- Decisions run while orders are paused. Pause prevents subsequent submissions after the next execution-state check; an already in-flight order may still finish. Pause/shutdown does **not** cancel orders or close positions. Manage urgent exits on Coinbase. This is not a stop-loss system; losses can exceed the budget and deposited margin.

## Failure recovery and concurrency

A dedicated MySQL connection holds a named execution lock. A unique 30-second slot prevents duplicate cycles. The use case commits an order intent **before** calling Coinbase. There are no network calls inside a DB transaction and no automatic order POST retries. The client order ID is the durable cycle ID.

After an ambiguous response or restart, reconcile pending intents against paginated exchange history. No further orders are allowed until the exchange reports terminal status. A missing order is not assumed rejected. If history never resolves an ambiguous intent, inspect Coinbase using its client ID and keep execution paused; do not delete/change the intent without independently establishing the final outcome. Worker errors and stale data appear in the UI.

The lock coordinates instances sharing this MySQL database, not separate installations with different databases. Use one installation and a dedicated personal futures account; manual or external account trading can race the last account check. Never run multiple installations against the same account. MySQL and provider availability affect monitoring. The decision loop can skip scheduled slots when a request is slow; it never runs overlapping or catch-up orders.

## Verification

```sh
poetry -C backend run pytest
poetry -C backend run mypy
poetry -C backend run ruff check src tests
poetry -C backend run python scripts/check_hexagonal_boundaries.py --root src
poetry -C backend run tach check
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend audit
```

Integration tests use disposable real MySQL and PostgreSQL containers (Docker required). Coinbase/Jev HTTP contract tests use injected HTTP transports and fixtures. They verify documented request/response mapping, **not live account eligibility or exchange behavior**. No profitable strategy is claimed. The configured account's read-only access and preview must be checked with real credentials before relying on execution.

## Primary references (checked September 24, 2026)

- [TypeSafe System One HTTP API](https://docs.typesafe.ai/api) and [state](https://docs.typesafe.ai/concepts/state): `POST https://api.typesafe.ai/v1/systemone`, `model`, `state`, typed `questions`, `answers`.
- [Coinbase authentication](https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication).
- [US futures API guide](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/guides/futures) and [margin/leverage](https://help.coinbase.com/en/coinbase/derivatives/us-derivatives-leverage-margin).
- [Products](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/products/get-product), [balance summary](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/futures/get-futures-balance-summary), [positions](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/futures/list-futures-positions), [preview](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/preview-orders), [orders](https://docs.cdp.coinbase.com/api-reference/advanced-trade-api/rest-api/orders/create-order).
- [International perpetual API retirement](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/guides/perpetual) and [migration](https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/guides/derivatives/technical).
