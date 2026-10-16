from dataclasses import replace
from datetime import timedelta
from decimal import Decimal

import pytest
from fakes.trading.services import NOW, decision, market

from app.trading.domain.models import (
    Action,
    Candle,
    Policy,
    Position,
    TradingError,
    plan_order,
)


def test_contract_size_and_rounding_never_exceed_budget():
    plan = plan_order(market(), decision(), Policy(), NOW)
    assert plan.contracts == 4
    assert plan.margin <= 1
    assert plan.notional <= 5
    assert plan.limit_price == Decimal("1001")


@pytest.mark.parametrize("action,side", [(Action.LONG, "BUY"), (Action.SHORT, "SELL")])
def test_direction_maps_to_futures_order(action, side):
    assert plan_order(market(), decision(action), Policy(), NOW).side == side


@pytest.mark.parametrize(
    "changes,message",
    [
        ({"available_margin": Decimal(".1")}, "Insufficient"),
        ({"open_orders": 1}, "Existing orders"),
        ({"other_positions": True}, "other futures"),
        ({"daily_pnl": Decimal(-5)}, "Daily loss"),
        ({"position": Position(Decimal(10))}, "exposure limit"),
    ],
)
def test_account_gates(changes, message):
    with pytest.raises(TradingError, match=message):
        plan_order(replace(market(), **changes), decision(), Policy(), NOW)


@pytest.mark.parametrize(
    "changes,message",
    [
        ({"contract_size": Decimal(".01")}, "Minimum contract"),
        ({"long_margin_rate": Decimal(".25")}, "not requested 5x"),
        ({"tradable": False}, "unavailable"),
        ({"expires_at": NOW + timedelta(hours=2)}, "expiry"),
        ({"max_size": Decimal(1)}, "maximum size"),
    ],
)
def test_product_gates(changes, message):
    state = market()
    with pytest.raises(TradingError, match=message):
        plan_order(
            replace(state, product=replace(state.product, **changes)), decision(), Policy(), NOW
        )


def test_opposite_action_reduces_without_reversing_even_at_loss_limit():
    state = replace(market(), position=Position(Decimal(2)), daily_pnl=Decimal(-10))
    plan = plan_order(state, decision(Action.SHORT), Policy(), NOW)
    assert plan.reducing and plan.contracts == 2 and plan.margin == 0


@pytest.mark.parametrize("kind", ["missing", "duplicate", "forming", "stale"])
def test_reject_incomplete_or_stale_market_data(kind):
    state = market()
    if kind == "missing":
        state = replace(state, candles=state.candles[:-1])
    elif kind == "duplicate":
        state = replace(state, candles=(state.candles[0], *state.candles[:-1]))
    elif kind == "forming":
        state = replace(
            state,
            candles=(
                *state.candles[:-1],
                replace(state.candles[-1], start=int(NOW.timestamp()) // 60 * 60),
            ),
        )
    else:
        state = replace(state, observed_at=NOW - timedelta(seconds=26))
    with pytest.raises(TradingError):
        plan_order(state, decision(), Policy(), NOW)


def test_hold_and_low_confidence_do_not_trade():
    for answer in (decision(Action.HOLD), replace(decision(), confidence=Decimal(".1"))):
        with pytest.raises(TradingError):
            plan_order(market(), answer, Policy(), NOW)


@pytest.mark.parametrize("bad", ["NaN", "Infinity", "-1"])
def test_invalid_candle_never_reaches_trader(bad):
    with pytest.raises(TradingError):
        Candle(0, Decimal(bad), Decimal(2), Decimal(1), Decimal(1), Decimal(1))


@pytest.mark.parametrize(
    "changes",
    [
        {"margin_budget": Decimal(3)},
        {"leverage": Decimal(10)},
        {"min_confidence": Decimal(2)},
        {"fee_reserve": Decimal(-1)},
    ],
)
def test_policy_rejects_unsupported_budget_and_leverage(changes):
    with pytest.raises(TradingError):
        Policy(**changes)


def test_invalid_probability_distribution_is_rejected():
    with pytest.raises(TradingError):
        replace(decision(), long_probability=Decimal(".5"))
