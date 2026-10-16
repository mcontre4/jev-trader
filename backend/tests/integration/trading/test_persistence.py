from dataclasses import replace
from decimal import Decimal
from threading import Event

import pytest
from fakes.trading.services import NOW, market
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.shared.infrastructure.sqlalchemy_unit_of_work import SqlAlchemyUnitOfWork
from app.trading.adapters.persistence import MysqlExecutionGuard, MysqlTradingRepository
from app.trading.domain.cycle_id import CycleId
from app.trading.domain.models import Cycle, OrderResult, TradingError

pytestmark = pytest.mark.integration


def test_mysql_roundtrip_preserves_decimal_and_timezone_and_control(clean_mysql):
    cycle = Cycle(
        CycleId("cycle_00000000-0000-0000-0000-000000000001"), 1, NOW, "live", snapshot=market()
    )
    with Session(clean_mysql) as session:
        repo, uow = MysqlTradingRepository(session), SqlAlchemyUnitOfWork(session)
        with uow:
            repo.add(cycle)
            repo.set_enabled(False)
            uow.commit()
        with uow:
            assert repo.recent(10) == (cycle,)
            assert not repo.enabled()
        with uow:
            repo.save(cycle.evolve(status="pending", order=OrderResult("exchange", "PENDING")))
            uow.commit()
        with uow:
            assert repo.unresolved()[0].order.id == "exchange"
            assert repo.recent(1)[0].snapshot.available_margin == Decimal(100)


def test_mysql_rollback_and_unique_slot_prevent_duplicate_intents(clean_mysql):
    cycle = Cycle(CycleId("cycle_00000000-0000-0000-0000-000000000001"), 1, NOW, "live")
    with Session(clean_mysql) as session:
        repo, uow = MysqlTradingRepository(session), SqlAlchemyUnitOfWork(session)
        with uow:
            repo.add(cycle)
        with uow:
            assert repo.recent(10) == ()
            repo.add(cycle)
            uow.commit()
        with pytest.raises(IntegrityError), uow:
            repo.add(replace(cycle, id=CycleId("cycle_00000000-0000-0000-0000-000000000002")))
            uow.commit()
        with uow:
            assert repo.recent(10) == (cycle,)


def test_unknown_status_blocks_and_mysql_lock_excludes_second_worker(clean_mysql):
    with Session(clean_mysql) as session, session.begin():
        repo = MysqlTradingRepository(session)
        repo.add(
            Cycle(
                CycleId("cycle_00000000-0000-0000-0000-000000000001"),
                1,
                NOW,
                "live",
                status="future_exchange_state",
            )
        )
        assert len(repo.unresolved()) == 1
    with clean_mysql.connect().execution_options(isolation_level="AUTOCOMMIT") as first:
        stop = Event()
        guard = MysqlExecutionGuard(first, stop)
        guard.check()
        stop.set()
        with pytest.raises(TradingError, match="shutting down"):
            guard.check()
        stop.clear()
        with clean_mysql.connect().execution_options(isolation_level="AUTOCOMMIT") as second:
            with pytest.raises(TradingError, match="Another"):
                MysqlExecutionGuard(second)
        # Explicit release: pooled connections otherwise retain MySQL session-level locks.
        from sqlalchemy import text

        first.execute(text("SELECT RELEASE_LOCK('jev_trader_execution')"))
        with pytest.raises(TradingError, match="lost"):
            guard.check()
