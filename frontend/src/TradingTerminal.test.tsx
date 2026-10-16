import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import TradingTerminal, { type TerminalClient } from "./TradingTerminal";

afterEach(cleanup);
const TOKEN = "recovery-test-token-00000000000000000000000000000000";

class FakeTerminalServer {
  enabled = true;
  calls: { url: string; init?: RequestInit }[] = [];
  reject = false;
  client: TerminalClient = async (url, init) => {
    this.calls.push({ url, init });
    if (url === "/api/health") return Response.json({ configured: true });
    if (this.reject)
      return Response.json({ detail: "Unauthorized" }, { status: 401 });
    if (url === "/api/execution") {
      this.enabled = JSON.parse(String(init?.body)).enabled;
      return Response.json({ enabled: this.enabled });
    }
    return Response.json({
      mode: "preview",
      enabled: this.enabled,
      interval_seconds: 30,
      cycles: [
        {
          id: "cycle_test",
          created_at: "2026-09-25T12:00:00Z",
          mode: "preview",
          status: "unknown",
          reason: "Order outcome unknown; reconciliation required",
          snapshot: null,
          decision: {
            action: "long",
            confidence: ".8",
            long_probability: ".8",
            short_probability: ".1",
            hold_probability: ".1",
            model: "jev-test",
          },
          plan: null,
          order: null,
        },
      ],
      worker: { status: "running" },
      policy: {
        leverage: "5",
        margin_budget: "1",
        max_position_notional: "10",
        max_daily_loss: "5",
        min_confidence: ".6",
        fee_reserve: ".1",
      },
    });
  };
}

it("authenticates with a header, pauses orders, and includes unresolved orders in the journal", async () => {
  const server = new FakeTerminalServer(),
    user = userEvent.setup();
  render(<TradingTerminal client={server.client} />);
  await user.type(screen.getByLabelText("Terminal token"), TOKEN);
  await user.click(screen.getByRole("button", { name: "Connect →" }));
  await screen.findByRole("button", { name: "Ⅱ Pause orders" });
  expect(
    server.calls.find((c) => c.url === "/api/terminal")?.init?.headers,
  ).toEqual({ Authorization: `Bearer ${TOKEN}` });
  await user.click(screen.getByRole("button", { name: "Ⅱ Pause orders" }));
  await screen.findByText(
    "Orders paused. Jev decisions continue. Existing positions remain open.",
  );
  expect(server.enabled).toBe(false);
  await user.click(screen.getByRole("button", { name: "Orders & fills" }));
  expect(
    screen.getAllByText("Order outcome unknown; reconciliation required")
      .length,
  ).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "Lock" }));
  expect(screen.getByLabelText("Terminal token")).toHaveValue("");
  expect(
    screen.queryByRole("button", { name: "Lock" }),
  ).not.toBeInTheDocument();
});

it("reports rejected authentication and leaves execution unavailable", async () => {
  const server = new FakeTerminalServer();
  server.reject = true;
  const user = userEvent.setup();
  render(<TradingTerminal client={server.client} />);
  await user.type(screen.getByLabelText("Terminal token"), TOKEN);
  await user.click(screen.getByRole("button", { name: "Connect →" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid terminal token",
  );
  expect(
    screen.getByRole("button", { name: "▶ Resume orders" }),
  ).toBeDisabled();
});
