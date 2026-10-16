import { useEffect, useState, type FormEvent } from "react";
import "./trading.css";

type Candle = {
  start: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};
type Snapshot = {
  observed_at: string;
  available_margin: string;
  equity: string;
  daily_pnl: string;
  open_orders: number;
  other_positions: boolean;
  product: {
    id: string;
    asset: string;
    price: string;
    contract_size: string;
    long_margin_rate: string;
    short_margin_rate: string;
  };
  position: { contracts: string; entry_price: string; unrealized_pnl: string };
  candles: Candle[];
};
type Cycle = {
  id: string;
  created_at: string;
  status: string;
  reason: string;
  mode: string;
  snapshot: Snapshot | null;
  decision: {
    action: string;
    confidence: string;
    long_probability: string;
    short_probability: string;
    hold_probability: string;
    model: string;
  } | null;
  plan: {
    side: string;
    contracts: string;
    notional: string;
    margin: string;
    limit_price: string;
    reducing: boolean;
  } | null;
  order: {
    id: string;
    status: string;
    filled_contracts: string;
    average_price: string;
    fees: string;
  } | null;
};
type Terminal = {
  mode: string;
  enabled: boolean;
  cycles: Cycle[];
  interval_seconds: number;
  policy: {
    leverage: string;
    margin_budget: string;
    max_position_notional: string;
    max_daily_loss: string;
    min_confidence: string;
    fee_reserve: string;
  };
  worker: {
    status: string;
    error?: string;
    next_cycle_at?: string;
    last_cycle_at?: string;
  };
};
const money = (n?: string) =>
  n === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(Number(n));
const time = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
const percent = (value: string) => `${(Number(value) * 100).toFixed(1)}%`;

function Candles({ candles }: { candles: Candle[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (!candles.length)
    return (
      <div className="chart-empty">
        <span className="crosshair">＋</span>
        <strong>Waiting for market data</strong>
        <span>60 closed one-minute candles will appear here.</span>
      </div>
    );
  const low = Math.min(...candles.map((c) => Number(c.low)));
  const high = Math.max(...candles.map((c) => Number(c.high)));
  const pad = Math.max((high - low) * 0.12, high * 0.0001);
  const bottom = low - pad,
    top = high + pad;
  const y = (n: number) => 20 + ((top - n) / (top - bottom)) * 240;
  const maxVolume = Math.max(...candles.map((c) => Number(c.volume)), 1);
  const current = candles[active ?? candles.length - 1];
  return (
    <>
      <div className="ohlc">
        <span>
          {new Date(current.start * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {(["open", "high", "low", "close"] as const).map((key) => (
          <span key={key}>
            {key[0].toUpperCase()} <b>{money(current[key])}</b>
          </span>
        ))}
        <span>
          V <b>{Number(current.volume).toFixed(2)}</b>
        </span>
      </div>
      <svg
        className="market-chart"
        viewBox="0 0 1000 340"
        role="img"
        aria-label="Last hour of one-minute futures candlesticks with volume"
        onMouseLeave={() => setActive(null)}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const price = top - ((top - bottom) * i) / 4;
          return (
            <g key={i}>
              <line
                x1="0"
                x2="918"
                y1={y(price)}
                y2={y(price)}
                className="grid-line"
              />
              <text x="934" y={y(price) + 4}>
                {money(String(price))}
              </text>
            </g>
          );
        })}
        {candles.map((c, i) => {
          const x = 10 + i * 15,
            up = Number(c.close) >= Number(c.open);
          return (
            <g
              key={c.start}
              onMouseEnter={() => setActive(i)}
              className={up ? "candle-up" : "candle-down"}
            >
              <rect
                x={x - 6}
                y="0"
                width="15"
                height="310"
                fill="transparent"
              />
              <line
                x1={x}
                x2={x}
                y1={y(Number(c.high))}
                y2={y(Number(c.low))}
              />
              <rect
                x={x - 4}
                width="8"
                y={Math.min(y(Number(c.open)), y(Number(c.close)))}
                height={Math.max(
                  1.5,
                  Math.abs(y(Number(c.open)) - y(Number(c.close))),
                )}
              />
              <rect
                x={x - 4}
                y={310 - (Number(c.volume) / maxVolume) * 32}
                width="8"
                height={Math.max(1, (Number(c.volume) / maxVolume) * 32)}
                opacity=".25"
              />
              {i % 15 === 0 && (
                <text x={x} y="334">
                  {new Date(c.start * 1000).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </text>
              )}
            </g>
          );
        })}
        {active !== null && (
          <line
            x1={10 + active * 15}
            x2={10 + active * 15}
            y1="0"
            y2="310"
            className="cursor-line"
          />
        )}
      </svg>
      <details className="candle-data">
        <summary>View all OHLCV values</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {["Time", "Open", "High", "Low", "Close", "Volume"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candles.map((c) => (
                <tr key={c.start}>
                  <td>{time(new Date(c.start * 1000).toISOString())}</td>
                  <td>{c.open}</td>
                  <td>{c.high}</td>
                  <td>{c.low}</td>
                  <td>{c.close}</td>
                  <td>{c.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

export type TerminalClient = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;
const browserClient: TerminalClient = (url, init) => fetch(url, init);

export default function TradingTerminal({
  client = browserClient,
}: {
  client?: TerminalClient;
}) {
  const [token, setToken] = useState(""),
    [input, setInput] = useState("");
  const [data, setData] = useState<Terminal | null>(null),
    [error, setError] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [now, setNow] = useState(Date.now()),
    [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "orders">("all"),
    [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    document.title = "Jev / Trading terminal";
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    client("/api/health", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setConfigured(d.configured))
      .catch(() => {});
    return () => controller.abort();
  }, [client]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await client("/api/terminal", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Invalid terminal token."
              : "Trading service unavailable. Check server configuration and MySQL.",
          );
        const next = (await response.json()) as Terminal;
        if (!Array.isArray(next.cycles) || !next.worker || !next.policy)
          throw new Error("Invalid terminal response.");
        if (!controller.signal.aborted) {
          setData(next);
          setError("");
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Connection lost.");
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [client, token, refresh]);
  const connect = (e: FormEvent) => {
    e.preventDefault();
    setToken(input);
    setInput("");
    setError("");
  };
  const toggle = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const response = await client("/api/execution", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: !data.enabled }),
      });
      if (!response.ok) throw new Error("Could not change execution state.");
      const result = await response.json();
      setData({ ...data, enabled: result.enabled });
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };
  const snapshot = data?.cycles.find((c) => c.snapshot)?.snapshot;
  const latest = data?.cycles.find((c) => c.decision);
  const detail = data?.cycles.find((c) => c.id === selected) ?? latest;
  const stale = !snapshot || now - Date.parse(snapshot.observed_at) > 65000;
  const next = data?.worker.next_cycle_at
    ? Math.max(
        0,
        Math.ceil((Date.parse(data.worker.next_cycle_at) - now) / 1000),
      )
    : null;
  const cycles =
    data?.cycles.filter(
      (c) =>
        filter === "all" ||
        c.order ||
        c.status === "unknown" ||
        c.status === "submitting",
    ) ?? [];
  const position = Number(snapshot?.position.contracts ?? 0);
  return (
    <div className="terminal-shell">
      <header className="terminal-header">
        <a className="brand" href="/" aria-label="Jev Trader home">
          <span className="brand-mark">j.</span>jev
          <span className="brand-divider" />{" "}
          <span className="brand-caption">TRADING TERMINAL</span>
        </a>
        <div className="header-right">
          <span
            className={`connection ${data && !error && !stale ? "connected" : ""}`}
          >
            <i />
            {error
              ? "Disconnected"
              : data
                ? stale
                  ? "Data stale"
                  : "Connected"
                : "Not connected"}
          </span>
          <span className="private-label">PERSONAL ACCOUNT</span>
          {token && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setToken("");
                setData(null);
                setError("");
              }}
            >
              Lock
            </button>
          )}
        </div>
      </header>
      <main>
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">COINBASE ADVANCED / US FUTURES</p>
            <h1>
              {snapshot?.product.asset ?? "Market"} <span>/ USD</span>
              <small>
                {snapshot?.product.id ?? "Awaiting contract discovery"}
              </small>
            </h1>
          </div>
          <div className="execution-tools">
            <span className="mode-label">
              {data?.mode === "live" ? "LIVE EXECUTION" : "PREVIEW MODE"}
            </span>
            <button
              className="primary-button"
              disabled={!data || busy || !!error}
              onClick={() => void toggle()}
            >
              {busy
                ? "Updating…"
                : data?.enabled
                  ? "Ⅱ Pause orders"
                  : "▶ Resume orders"}
            </button>
          </div>
        </div>
        {!data && (
          <section className="connect-panel">
            <div>
              <h2>Connect your terminal</h2>
              <p>
                {configured === false
                  ? "Add Coinbase, Jev, MySQL and your terminal token to the server .env, then restart."
                  : "Unlock with the terminal token from your server .env. Coinbase credentials stay on the server."}
              </p>
            </div>
            <form onSubmit={connect}>
              <label htmlFor="terminal-token" className="sr-only">
                Terminal token
              </label>
              <input
                id="terminal-token"
                type="password"
                autoComplete="off"
                placeholder="Terminal token"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                required
                minLength={32}
              />
              <button className="primary-button" type="submit">
                Connect →
              </button>
            </form>
          </section>
        )}
        {error && (
          <div role="alert" className="notice error">
            {error} Displayed values may be stale.
          </div>
        )}
        {data?.worker.error && (
          <div role="alert" className="notice error">
            {data.worker.error}
          </div>
        )}
        {data && !data.enabled && (
          <div className="notice">
            Orders paused. Jev decisions continue. Existing positions remain
            open.
          </div>
        )}
        {data?.mode === "preview" && (
          <div className="notice subtle">
            Preview mode reads your real account and asks Jev. It never submits
            an order or simulates a fill.
          </div>
        )}
        <div className="account-strip">
          <div>
            <span>FUTURES EQUITY</span>
            <strong>{money(snapshot?.equity)}</strong>
          </div>
          <div>
            <span>AVAILABLE MARGIN</span>
            <strong>{money(snapshot?.available_margin)}</strong>
          </div>
          <div>
            <span>POSITION</span>
            <strong>
              {snapshot ? `${Math.abs(position)} contracts` : "—"}{" "}
              <small>
                {snapshot
                  ? position === 0
                    ? "FLAT"
                    : position > 0
                      ? "LONG"
                      : "SHORT"
                  : ""}
              </small>
            </strong>
          </div>
          <div>
            <span>UNREALIZED P&L</span>
            <strong
              className={
                Number(snapshot?.position.unrealized_pnl) > 0 ? "positive" : ""
              }
            >
              {money(snapshot?.position.unrealized_pnl)}
            </strong>
          </div>
          <div>
            <span>DAILY P&L + UNREALIZED</span>
            <strong>{money(snapshot?.daily_pnl)}</strong>
          </div>
        </div>
        <div className="trading-workspace">
          <section className="chart-panel">
            <div className="panel-heading">
              <h2>
                Price action <span>1m</span>
              </h2>
              <span className="muted">LAST 60 MINUTES · CLOSED CANDLES</span>
            </div>
            <div className="price-line">
              <strong>{money(snapshot?.product.price)}</strong>
              <span>
                {snapshot
                  ? `Updated ${time(snapshot.observed_at)}`
                  : "Waiting for Coinbase"}
                {stale && snapshot ? " · STALE" : ""}
              </span>
            </div>
            <Candles candles={snapshot?.candles ?? []} />
          </section>
          <aside className="decision-panel">
            <div className="panel-heading">
              <h2>Trader model</h2>
              <span className="model-mark">JEV</span>
            </div>
            <div className="decision-clock">
              <span>NEXT EVALUATION</span>
              <strong>
                {next === null ? "—" : `${next.toString().padStart(2, "0")}s`}
              </strong>
            </div>
            <div
              className={`decision-action ${latest?.decision?.action ?? ""}`}
            >
              {latest?.decision?.action ?? "Waiting"}
              <span>
                {latest?.decision
                  ? `${percent(latest.decision.confidence)} confidence`
                  : "No decision received"}
              </span>
            </div>
            <div className="probabilities">
              {(["long", "short", "hold"] as const).map((action) => {
                const probability =
                  latest?.decision?.[`${action}_probability`] ?? "0";
                return (
                  <div key={action}>
                    <span>{action}</span>
                    <div className="probability-track">
                      <i style={{ width: `${Number(probability) * 100}%` }} />
                    </div>
                    <b>{latest?.decision ? percent(probability) : "—"}</b>
                  </div>
                );
              })}
            </div>
            <p className="decision-note">
              {latest?.reason ||
                "Typed decisions. Deterministic execution rules."}
            </p>
            <dl className="risk-list">
              <div>
                <dt>Margin per order</dt>
                <dd>{money(data?.policy.margin_budget)}</dd>
              </div>
              <div>
                <dt>Leverage target</dt>
                <dd>5×</dd>
              </div>
              <div>
                <dt>Position limit</dt>
                <dd>{money(data?.policy.max_position_notional)}</dd>
              </div>
              <div>
                <dt>Daily loss limit</dt>
                <dd>{money(data?.policy.max_daily_loss)}</dd>
              </div>
              <div>
                <dt>Fee reserve / order</dt>
                <dd>{money(data?.policy.fee_reserve)}</dd>
              </div>
            </dl>
          </aside>
        </div>
        <section className="journal">
          <div className="panel-heading">
            <div className="journal-tabs">
              <button
                className={filter === "all" ? "active" : ""}
                onClick={() => setFilter("all")}
              >
                Decision journal <span>{data?.cycles.length ?? 0}</span>
              </button>
              <button
                className={filter === "orders" ? "active" : ""}
                onClick={() => setFilter("orders")}
              >
                Orders & fills
              </button>
            </div>
            <span className="muted">EVERY 30 SECONDS</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>DECISION</th>
                  <th>CONFIDENCE</th>
                  <th>EXECUTION</th>
                  <th>FILLED</th>
                  <th>DETAIL</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <tr
                    key={c.id}
                    className={detail?.id === c.id ? "selected-row" : ""}
                  >
                    <td>
                      <button
                        className="row-button"
                        onClick={() => setSelected(c.id)}
                      >
                        {time(c.created_at)} ↗
                      </button>
                    </td>
                    <td className={`action-cell ${c.decision?.action ?? ""}`}>
                      {c.decision?.action ?? "—"}
                    </td>
                    <td>{c.decision ? percent(c.decision.confidence) : "—"}</td>
                    <td>
                      <span className={`status status-${c.status}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.order
                        ? `${c.order.filled_contracts} @ ${money(c.order.average_price)}`
                        : "—"}
                    </td>
                    <td className="reason-cell">
                      {c.reason ||
                        (c.order
                          ? `Order ${c.order.id}`
                          : "Collecting market data")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cycles.length === 0 && (
              <div className="journal-empty">
                {filter === "orders"
                  ? "No submitted orders yet."
                  : "Your decisions and execution results will appear here."}
              </div>
            )}
          </div>
        </section>
        {detail && (
          <section className="event-inspector">
            <div>
              <p className="eyebrow">
                SELECTED CYCLE / {time(detail.created_at)}
              </p>
              <h2>
                {detail.decision?.action ?? "No decision"}{" "}
                <span className="muted">· {detail.status}</span>
              </h2>
              <p>{detail.reason}</p>
              <code>{detail.id}</code>
            </div>
            <dl className="risk-list">
              <div>
                <dt>Model</dt>
                <dd>{detail.decision?.model ?? "—"}</dd>
              </div>
              <div>
                <dt>Requested contracts</dt>
                <dd>{detail.plan?.contracts ?? "—"}</dd>
              </div>
              <div>
                <dt>Limit price</dt>
                <dd>{money(detail.plan?.limit_price)}</dd>
              </div>
              <div>
                <dt>Order ID</dt>
                <dd className="order-id">{detail.order?.id || "—"}</dd>
              </div>
              <div>
                <dt>Fees paid</dt>
                <dd>{money(detail.order?.fees)}</dd>
              </div>
            </dl>
            <dl className="risk-list">
              <div>
                <dt>Average entry</dt>
                <dd>{money(snapshot?.position.entry_price)}</dd>
              </div>
              <div>
                <dt>Underlying per contract</dt>
                <dd>{snapshot?.product.contract_size ?? "—"}</dd>
              </div>
              <div>
                <dt>Open futures orders</dt>
                <dd>{snapshot?.open_orders ?? "—"}</dd>
              </div>
              <div>
                <dt>Overnight long / short leverage</dt>
                <dd>
                  {snapshot
                    ? `${(1 / Number(snapshot.product.long_margin_rate)).toFixed(2)}× / ${(1 / Number(snapshot.product.short_margin_rate)).toFixed(2)}×`
                    : "—"}
                </dd>
              </div>
            </dl>
          </section>
        )}
        <footer className="terminal-footer">
          <span>
            <i /> {data?.worker.status ?? "Offline"} · Refreshes every 3s
          </span>
          <span>
            Futures can lose more than deposited margin. Pausing does not close
            positions.
          </span>
          <span>{new Date(now).toLocaleTimeString()} LOCAL</span>
        </footer>
      </main>
    </div>
  );
}
