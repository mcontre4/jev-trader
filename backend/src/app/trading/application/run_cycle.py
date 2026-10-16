from dataclasses import dataclass

from app.shared.application.unit_of_work import UnitOfWork
from app.shared.domain.clock import Clock
from app.shared.domain.id_generator import IdGenerator
from app.trading.domain.cycle_id import CycleId
from app.trading.domain.models import Cycle, Policy, TradingError, plan_order
from app.trading.ports.services import Exchange, ExecutionGuard, TraderModel, TradingRepository


@dataclass(frozen=True)
class RunCycleRequest:
    mode: str


@dataclass(frozen=True)
class RunCycleResponse:
    cycle_id: str
    status: str


class RunCycle:
    def __init__(
        self,
        exchange: Exchange,
        trader: TraderModel,
        repository: TradingRepository,
        uow: UnitOfWork,
        clock: Clock,
        ids: IdGenerator,
        policy: Policy,
        guard: ExecutionGuard,
    ) -> None:
        self._exchange, self._trader, self._repo = exchange, trader, repository
        self._uow, self._ids = uow, ids
        self._clock = clock
        self._policy, self._guard = policy, guard

    def execute(self, request: RunCycleRequest) -> RunCycleResponse:
        self._guard.check()
        now = self._clock.now()
        cycle = Cycle(
            CycleId(f"cycle_{self._ids.new_uuid()}"), int(now.timestamp()) // 30, now, request.mode
        )
        # End every database transaction before making external calls.
        with self._uow:
            pending = self._repo.unresolved()
            enabled = self._repo.enabled()
            self._repo.add(cycle)
            self._uow.commit()
        for previous in pending:
            result = self._exchange.reconcile(
                str(previous.id), previous.order.id if previous.order else None
            )
            if result is None or not result.terminal:
                return self._finish(
                    cycle.evolve(
                        status="blocked", reason="Unresolved previous order; no new orders allowed"
                    )
                )
            with self._uow:
                self._repo.save(previous.evolve(order=result, status=result.status.lower()))
                self._uow.commit()
        try:
            snapshot = self._exchange.snapshot()
            cycle = cycle.evolve(snapshot=snapshot)
            snapshot.validate_window(self._clock.now())
            decision = self._trader.decide(snapshot, self._policy)
            cycle = cycle.evolve(decision=decision)
            if not enabled:
                raise TradingError("Execution paused; decisions continue")
            plan = plan_order(snapshot, decision, self._policy, self._clock.now())
            cycle = cycle.evolve(plan=plan)
            preview = self._exchange.preview(plan)
            if preview.errors:
                raise TradingError("Coinbase preview rejected the order")
            if not preview.id or not preview.commission.is_finite() or preview.commission < 0:
                raise TradingError("Invalid Coinbase preview")
            if preview.commission > self._policy.fee_reserve:
                raise TradingError("Preview fees exceed reserved budget")
            if snapshot.available_margin < plan.margin + preview.commission:
                raise TradingError("Insufficient margin for preview fees")
            if request.mode == "preview":
                return self._finish(
                    cycle.evolve(status="previewed", reason="Preview only; no order sent")
                )
            # Refresh account and product after inference/preview; reject changed sizing/position.
            refreshed = self._exchange.snapshot()
            verified = plan_order(refreshed, decision, self._policy, self._clock.now())
            if (
                refreshed.position != snapshot.position
                or verified.contracts != plan.contracts
                or verified.side != plan.side
                or verified.margin > plan.margin
            ):
                raise TradingError("Account or market changed during decision; wait for next cycle")
            with self._uow:
                if not self._repo.enabled():
                    raise TradingError("Execution paused before submission")
                cycle = cycle.evolve(status="submitting")
                self._repo.save(cycle)
                self._uow.commit()
            # Durable intent precedes submission. A crash/timeout remains unresolved, never retried.
            self._guard.check()
            snapshot.validate_window(self._clock.now())
            try:
                order = self._exchange.submit(str(cycle.id), plan, preview.id)
            except Exception:
                return self._finish(
                    cycle.evolve(
                        status="unknown", reason="Order outcome unknown; reconciliation required"
                    )
                )
            return self._finish(cycle.evolve(order=order, status=order.status.lower()))
        except TradingError as error:
            if cycle.status == "submitting":
                return self._finish(
                    cycle.evolve(
                        status="unknown",
                        reason="Submission interrupted; reconcile before continuing",
                    )
                )
            return self._finish(cycle.evolve(status="blocked", reason=str(error)))
        except Exception:
            if cycle.status == "submitting":
                return self._finish(
                    cycle.evolve(
                        status="unknown",
                        reason="Submission interrupted; reconcile before continuing",
                    )
                )
            return self._finish(
                cycle.evolve(status="error", reason="Provider unavailable or invalid response")
            )

    def _finish(self, cycle: Cycle) -> RunCycleResponse:
        with self._uow:
            self._repo.save(cycle)
            self._uow.commit()
        return RunCycleResponse(str(cycle.id), cycle.status)
