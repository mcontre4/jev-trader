# README screenshots

These images were captured from the production React build in Chromium on October 15, 2026. The browser's `/api/health` and `/api/terminal` requests were intercepted with synthetic responses; no exchange, model, database, or live account was connected.

- `terminal.png`: synthetic candles, a flat position, preview mode, paused execution, and a blocked model decision.
- `journal.png`: synthetic decision history and cycle details. All decisions are blocked or hold; no fills or returns are represented.

The displayed $100 balance, prices, probabilities, demo product, model name, and cycle IDs are invented documentation examples. They do not demonstrate profitability or prove that a contract is tradable. A screenshot-only banner labels the terminal image; it is not part of the application.

To refresh these images, build the frontend, serve it on localhost, and use browser request interception with the response shape in `frontend/src/TradingTerminal.tsx`. Supply a synthetic terminal token of at least 32 characters. Keep the UI in preview mode, keep orders paused, and never connect a real account to capture public documentation.
