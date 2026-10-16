from types import SimpleNamespace

import pytest
from fakes.trading.services import (
    FakeClock,
    FakeGuard,
    FakeIds,
    FakeTrader,
    FakeUnitOfWork,
    InMemoryTradingRepository,
    RecordingExchange,
)

from app.trading.application.run_cycle import RunCycle
from app.trading.domain.models import Policy


@pytest.fixture
def bot():
    repo = InMemoryTradingRepository()
    uow = FakeUnitOfWork(repo)
    clock, ids, guard = FakeClock(), FakeIds(), FakeGuard()
    exchange, trader = RecordingExchange(uow), FakeTrader(uow)
    service = RunCycle(exchange, trader, repo, uow, clock, ids, Policy(), guard)
    return SimpleNamespace(
        repo=repo,
        uow=uow,
        clock=clock,
        ids=ids,
        guard=guard,
        exchange=exchange,
        trader=trader,
        service=service,
    )
