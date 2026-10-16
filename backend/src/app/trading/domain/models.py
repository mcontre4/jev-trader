"""Pure trading values and deterministic execution rules. All money uses Decimal."""

from dataclasses import dataclass, replace
from datetime import datetime, timedelta
from decimal import ROUND_DOWN, Decimal
from enum import StrEnum

from app.trading.domain.cycle_id import CycleId


class TradingError(Exception):
    """A safe, operator-facing failure (never include provider payloads or secrets)."""


class Action(StrEnum):
    LONG = "long"
    SHORT = "short"
    HOLD = "hold"


def finite(*values: Decimal) -> None:
    if not all(v.is_finite() for v in values):
        raise TradingError("Non-finite financial value")


@dataclass(frozen=True)
class Candle:
    start: int
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal

    def __post_init__(self) -> None:
        finite(self.open, self.high, self.low, self.close, self.volume)
        if (
            not (
                0
                < self.low
                <= min(self.open, self.close)
                <= max(self.open, self.close)
                <= self.high
            )
            or self.volume < 0
        ):
            raise TradingError("Invalid candle")


@dataclass(frozen=True)
class Product:
    id: str
    asset: str
    price: Decimal
    contract_size: Decimal
    size_increment: Decimal
    min_size: Decimal
    max_size: Decimal
    price_increment: Decimal
    long_margin_rate: Decimal
    short_margin_rate: Decimal
    tradable: bool
    expires_at: datetime

    def __post_init__(self) -> None:
        values = (
            self.price,
            self.contract_size,
            self.size_increment,
            self.min_size,
            self.max_size,
            self.price_increment,
            self.long_margin_rate,
            self.short_margin_rate,
        )
        finite(*values)
        if any(v <= 0 for v in values) or self.expires_at.tzinfo is None:
            raise TradingError("Incomplete contract specifications")


@dataclass(frozen=True)
class Position:
    contracts: Decimal = Decimal(0)  # signed: long positive, short negative
    entry_price: Decimal = Decimal(0)
    unrealized_pnl: Decimal = Decimal(0)

    def __post_init__(self) -> None:
        finite(self.contracts, self.entry_price, self.unrealized_pnl)


@dataclass(frozen=True)
class Snapshot:
    observed_at: datetime
    product: Product
    candles: tuple[Candle, ...]
    available_margin: Decimal
    equity: Decimal
    daily_pnl: Decimal
    position: Position
    open_orders: int
    other_positions: bool

    def validate_window(self, now: datetime) -> None:
        finite(self.available_margin, self.equity, self.daily_pnl)
        age = (now - self.observed_at).total_seconds()
        if not 0 <= age <= 25:
            raise TradingError("Account snapshot is stale")
        end = int(self.observed_at.timestamp()) // 60 * 60
        expected = tuple(range(end - 3600, end, 60))
        if tuple(c.start for c in self.candles) != expected:
            raise TradingError("Need 60 consecutive, closed one-minute candles")


@dataclass(frozen=True)
class Decision:
    action: Action
    confidence: Decimal
    long_probability: Decimal
    short_probability: Decimal
    hold_probability: Decimal
    model: str

    def __post_init__(self) -> None:
        probs = (self.long_probability, self.short_probability, self.hold_probability)
        finite(self.confidence, *probs)
        if any(p < 0 or p > 1 for p in (*probs, self.confidence)):
            raise TradingError("Invalid model probabilities")
        if abs(sum(probs, Decimal(0)) - 1) > Decimal("0.001"):
            raise TradingError("Model probabilities do not sum to one")


@dataclass(frozen=True)
class Policy:
    margin_budget: Decimal = Decimal("1")
    leverage: Decimal = Decimal("5")
    max_position_notional: Decimal = Decimal("10")
    max_daily_loss: Decimal = Decimal("5")
    min_confidence: Decimal = Decimal("0.6")
    slippage_bps: Decimal = Decimal("10")
    fee_reserve: Decimal = Decimal("0.10")

    def __post_init__(self) -> None:
        finite(
            self.margin_budget,
            self.leverage,
            self.max_position_notional,
            self.max_daily_loss,
            self.min_confidence,
            self.slippage_bps,
            self.fee_reserve,
        )
        if self.margin_budget not in (Decimal(1), Decimal(2)) or self.leverage != 5:
            raise TradingError("Supported budget is $1 or $2, with a 5x leverage target")
        if not (
            0 <= self.min_confidence <= 1
            and 0 < self.slippage_bps <= 100
            and self.max_position_notional > 0
            and self.max_daily_loss > 0
            and self.fee_reserve >= 0
        ):
            raise TradingError("Invalid risk limits")


@dataclass(frozen=True)
class OrderPlan:
    product_id: str
    side: str
    contracts: Decimal
    limit_price: Decimal
    notional: Decimal
    margin: Decimal
    reducing: bool


@dataclass(frozen=True)
class Preview:
    id: str
    commission: Decimal
    errors: tuple[str, ...]


@dataclass(frozen=True)
class OrderResult:
    id: str
    status: str
    filled_contracts: Decimal = Decimal(0)
    average_price: Decimal = Decimal(0)
    fees: Decimal = Decimal(0)

    def __post_init__(self) -> None:
        finite(self.filled_contracts, self.average_price, self.fees)
        if min(self.filled_contracts, self.average_price, self.fees) < 0:
            raise TradingError("Invalid order execution data")

    @property
    def terminal(self) -> bool:
        return self.status in {"FILLED", "CANCELLED", "EXPIRED", "FAILED", "REJECTED"}


def plan_order(snapshot: Snapshot, decision: Decision, policy: Policy, now: datetime) -> OrderPlan:
    snapshot.validate_window(now)
    p = snapshot.product
    if decision.action == Action.HOLD:
        raise TradingError("Jev chose hold")
    if decision.confidence < policy.min_confidence:
        raise TradingError("Model confidence below threshold")
    if not p.tradable or p.expires_at <= now + timedelta(days=1):
        raise TradingError("Contract unavailable or within 24 hours of expiry")
    if snapshot.open_orders or snapshot.other_positions:
        raise TradingError("Existing orders or other futures positions require review")
    side = "BUY" if decision.action == Action.LONG else "SELL"
    sign = Decimal(1) if side == "BUY" else Decimal(-1)
    reducing = snapshot.position.contracts * sign < 0
    rate = p.long_margin_rate if side == "BUY" else p.short_margin_rate
    # CFM has exchange-set leverage. Never pretend the REST leverage field sets it.
    if not reducing and rate != Decimal(1) / policy.leverage:
        raise TradingError(f"CFM overnight margin implies {1 / rate:.2f}x, not requested 5x")
    adjustment = policy.slippage_bps / 10000
    raw_price = p.price * (1 + adjustment * sign)
    # Floor buy caps; ceil sell floors, so rounding never widens the allowed slippage.
    ticks = raw_price / p.price_increment
    price = (
        ticks.to_integral_value(rounding="ROUND_FLOOR" if side == "BUY" else "ROUND_CEILING")
        * p.price_increment
    )
    unit_notional = max(price, p.price) * p.contract_size
    size = (
        policy.margin_budget * policy.leverage / unit_notional / p.size_increment
    ).to_integral_value(rounding=ROUND_DOWN) * p.size_increment
    if reducing:
        size = min(size, abs(snapshot.position.contracts))
    if size < p.min_size or size <= 0:
        minimum = p.min_size * unit_notional / policy.leverage
        raise TradingError(
            f"Minimum contract needs at least ${minimum:.2f} margin; budget too small"
        )
    if size > p.max_size:
        raise TradingError("Contract maximum size exceeded")
    notional = size * unit_notional
    margin = Decimal(0) if reducing else notional * rate
    if not reducing:
        if snapshot.daily_pnl <= -policy.max_daily_loss:
            raise TradingError("Daily loss limit reached")
        exposure = abs(snapshot.position.contracts + sign * size) * unit_notional
        if exposure > policy.max_position_notional:
            raise TradingError("Position exposure limit reached")
        if snapshot.available_margin < margin + policy.fee_reserve:
            raise TradingError("Insufficient futures margin including fee reserve")
    return OrderPlan(p.id, side, size, price, notional, margin, reducing)


@dataclass(frozen=True)
class Cycle:
    id: CycleId
    slot: int
    created_at: datetime
    mode: str
    status: str = "observing"
    reason: str = ""
    snapshot: Snapshot | None = None
    decision: Decision | None = None
    plan: OrderPlan | None = None
    order: OrderResult | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.id, CycleId) or self.mode not in {"preview", "live"}:
            raise TradingError("Invalid cycle identity or mode")

    def evolve(
        self,
        *,
        status: str | None = None,
        reason: str | None = None,
        snapshot: Snapshot | None = None,
        decision: Decision | None = None,
        plan: OrderPlan | None = None,
        order: OrderResult | None = None,
    ) -> "Cycle":
        return replace(
            self,
            status=status if status is not None else self.status,
            reason=reason if reason is not None else self.reason,
            snapshot=snapshot if snapshot is not None else self.snapshot,
            decision=decision if decision is not None else self.decision,
            plan=plan if plan is not None else self.plan,
            order=order if order is not None else self.order,
        )
