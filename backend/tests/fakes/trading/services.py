from dataclasses import replace
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from types import TracebackType
from uuid import UUID

from app.trading.domain.models import (
    Action,
    Candle,
    Cycle,
    Decision,
    OrderPlan,
    OrderResult,
    Policy,
    Position,
    Preview,
    Product,
    Snapshot,
    TradingError,
)

NOW = datetime(2026, 9, 25, 12, 0, 5, tzinfo=UTC)


def market() -> Snapshot:
    end = int(NOW.timestamp()) // 60 * 60
    return Snapshot(
        NOW,
        Product(
            "BTC-TEST-CDE",
            "BTC",
            Decimal(1000),
            Decimal(".001"),
            Decimal(1),
            Decimal(1),
            Decimal(10000),
            Decimal(".01"),
            Decimal(".2"),
            Decimal(".2"),
            True,
            NOW + timedelta(days=30),
        ),
        tuple(
            Candle(i, Decimal(1000), Decimal(1001), Decimal(999), Decimal(1000), Decimal(5))
            for i in range(end - 3600, end, 60)
        ),
        Decimal(100),
        Decimal(100),
        Decimal(0),
        Position(),
        0,
        False,
    )


def decision(action: Action = Action.LONG) -> Decision:
    return Decision(
        action,
        Decimal(".9"),
        Decimal(".9") if action == Action.LONG else Decimal(".05"),
        Decimal(".9") if action == Action.SHORT else Decimal(".05"),
        Decimal(".9") if action == Action.HOLD else Decimal(".05"),
        "jev-test",
    )


class FakeClock:
    def __init__(self) -> None:
        self.value = NOW

    def now(self) -> datetime:
        return self.value


class FakeIds:
    def __init__(self) -> None:
        self.counter = 0

    def new_uuid(self) -> UUID:
        self.counter += 1
        return UUID(int=self.counter)


class InMemoryTradingRepository:
    def __init__(self) -> None:
        self.cycles: dict[str, Cycle] = {}
        self.running = True

    def add(self, cycle: Cycle) -> None:
        if any(c.slot == cycle.slot for c in self.cycles.values()):
            raise TradingError("Duplicate slot")
        self.cycles[str(cycle.id)] = cycle

    def save(self, cycle: Cycle) -> None:
        self.cycles[str(cycle.id)] = cycle

    def recent(self, limit: int) -> tuple[Cycle, ...]:
        return tuple(sorted(self.cycles.values(), key=lambda c: c.slot, reverse=True)[:limit])

    def unresolved(self) -> tuple[Cycle, ...]:
        return tuple(
            c for c in self.cycles.values() if c.status in {"submitting", "pending", "unknown"}
        )

    def enabled(self) -> bool:
        return self.running

    def set_enabled(self, enabled: bool) -> None:
        self.running = enabled


class FakeUnitOfWork:
    def __init__(self, repository: InMemoryTradingRepository) -> None:
        self.repo = repository
        self.active = False
        self.committed = False
        self.commits = 0

    def __enter__(self) -> "FakeUnitOfWork":
        self.active, self.committed = True, False
        self.before = dict(self.repo.cycles)
        return self

    def __exit__(
        self,
        exception_type: type[BaseException] | None,
        exception: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        if exception_type or not self.committed:
            self.repo.cycles = self.before
        self.active = False

    def commit(self) -> None:
        self.commits += 1
        self.committed = True

    def rollback(self) -> None:
        self.repo.cycles = self.before


class FakeGuard:
    def __init__(self) -> None:
        self.checks = 0
        self.fail_on = 0

    def check(self) -> None:
        self.checks += 1
        if self.checks == self.fail_on:
            raise TradingError("Lost lock")


class RecordingExchange:
    def __init__(self, uow: FakeUnitOfWork) -> None:
        self.uow = uow
        self.state = market()
        self.submissions: list[tuple[str, OrderPlan]] = []
        self.previews: list[OrderPlan] = []
        self.preview_result = Preview("preview-1", Decimal(".01"), ())
        self.result = OrderResult("order-1", "PENDING")
        self.reconciled: OrderResult | None = None
        self.raise_on_submit = False
        self.on_preview_pause = False
        self.changed_position = False
        self.snapshot_calls = 0

    def snapshot(self) -> Snapshot:
        assert not self.uow.active
        self.snapshot_calls += 1
        if self.changed_position and self.snapshot_calls > 1:
            return replace(self.state, position=Position(Decimal(1)))
        return self.state

    def preview(self, plan: OrderPlan) -> Preview:
        assert not self.uow.active
        self.previews.append(plan)
        if self.on_preview_pause:
            self.uow.repo.running = False
        return self.preview_result

    def submit(self, client_id: str, plan: OrderPlan, preview_id: str) -> OrderResult:
        assert not self.uow.active
        assert self.uow.repo.cycles[client_id].status == "submitting"
        self.submissions.append((client_id, plan))
        if self.raise_on_submit:
            raise TimeoutError("sensitive provider response")
        return self.result

    def reconcile(self, client_id: str, order_id: str | None) -> OrderResult | None:
        assert not self.uow.active
        return self.reconciled


class FakeTrader:
    def __init__(self, uow: FakeUnitOfWork) -> None:
        self.uow = uow
        self.result = decision()
        self.calls = 0
        self.error = False

    def decide(self, snapshot: Snapshot, policy: Policy) -> Decision:
        assert not self.uow.active
        self.calls += 1
        if self.error:
            raise ValueError("secret")
        return self.result
