from dataclasses import replace
from datetime import timedelta
from decimal import Decimal

import pytest
from fakes.trading.services import decision

from app.trading.application.run_cycle import RunCycleRequest
from app.trading.application.terminal import (
    GetTerminal,
    GetTerminalRequest,
    SetExecution,
    SetExecutionRequest,
)
from app.trading.domain.models import Action, OrderResult, Policy, TradingError


def run(bot, mode="live"):
    result = bot.service.execute(RunCycleRequest(mode))
    return bot.repo.cycles[result.cycle_id]


def advance(bot):
    bot.clock.value += timedelta(seconds=30)
    bot.exchange.state = replace(bot.exchange.state, observed_at=bot.clock.value)


def test_live_intent_is_committed_before_network_without_open_transaction(bot):
    cycle = run(bot)
    assert cycle.status == "pending"
    assert cycle.order.id == "order-1"
    assert bot.exchange.submissions[0][0] == str(cycle.id)
    assert cycle.decision.action == Action.LONG


def test_preview_uses_real_preview_but_never_submits(bot):
    cycle = run(bot, "preview")
    assert cycle.status == "previewed"
    assert len(bot.exchange.previews) == 1
    assert bot.exchange.submissions == []


@pytest.mark.parametrize(
    "failure", ["hold", "paused", "model", "fees", "preview", "changed", "late_pause"]
)
def test_blocked_and_failed_cycles_are_journaled_without_submission(bot, failure):
    if failure == "hold":
        bot.trader.result = decision(Action.HOLD)
    if failure == "paused":
        bot.repo.running = False
    if failure == "model":
        bot.trader.error = True
    if failure == "fees":
        bot.exchange.preview_result = replace(bot.exchange.preview_result, commission=Decimal(1))
    if failure == "preview":
        bot.exchange.preview_result = replace(bot.exchange.preview_result, errors=("REJECTED",))
    if failure == "changed":
        bot.exchange.changed_position = True
    if failure == "late_pause":
        bot.exchange.on_preview_pause = True
    cycle = run(bot)
    assert cycle.status in {"blocked", "error"}
    assert cycle.reason and "secret" not in cycle.reason
    assert not bot.exchange.submissions


def test_timeout_blocks_new_orders_across_cycles(bot):
    bot.exchange.raise_on_submit = True
    first = run(bot)
    assert first.status == "unknown"
    advance(bot)
    second = run(bot)
    assert second.status == "blocked" and "Unresolved" in second.reason
    assert len(bot.exchange.submissions) == 1


def test_reconciliation_records_actual_fill_before_next_decision(bot):
    first = run(bot)
    bot.exchange.reconciled = OrderResult(
        "order-1", "FILLED", Decimal(4), Decimal(1000), Decimal(".01")
    )
    bot.trader.result = decision(Action.HOLD)
    advance(bot)
    second = run(bot)
    assert second.status == "blocked"
    assert bot.repo.cycles[str(first.id)].order.filled_contracts == 4
    assert bot.repo.cycles[str(first.id)].status == "filled"
    assert len(bot.exchange.submissions) == 1


def test_lock_loss_after_intent_remains_unresolved(bot):
    bot.guard.fail_on = 2
    cycle = run(bot)
    assert cycle.status == "unknown"
    assert not bot.exchange.submissions
    assert bot.repo.unresolved() == (cycle,)


def test_duplicate_time_slot_cannot_submit_twice(bot):
    run(bot)
    with pytest.raises(TradingError, match="Duplicate"):
        run(bot)
    assert len(bot.exchange.submissions) == 1


def test_pause_and_terminal_use_cases_return_dtos(bot):
    run(bot, "preview")
    result = SetExecution(bot.repo, bot.uow).execute(SetExecutionRequest(False))
    assert not result.enabled
    response = GetTerminal(bot.repo, bot.uow, Policy(), "preview").execute(GetTerminalRequest())
    assert '"enabled": false' in response.payload
    assert '"status": "previewed"' in response.payload
