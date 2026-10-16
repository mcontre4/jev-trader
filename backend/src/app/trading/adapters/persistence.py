from threading import Event
from typing import Any

from sqlalchemy import JSON, BigInteger, Boolean, String, select, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from app.trading.adapters.serialization import json_value, read_cycle
from app.trading.domain.models import Cycle, TradingError


class TradingBase(DeclarativeBase):
    pass


class CycleRow(TradingBase):
    __tablename__ = "trading_cycles"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    slot: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)


class ControlRow(TradingBase):
    __tablename__ = "trading_control"
    id: Mapped[int] = mapped_column(primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class MysqlTradingRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, cycle: Cycle) -> None:
        self._session.add(
            CycleRow(
                id=str(cycle.id), slot=cycle.slot, status=cycle.status, payload=json_value(cycle)
            )
        )
        self._session.flush()

    def save(self, cycle: Cycle) -> None:
        row = self._session.get(CycleRow, str(cycle.id))
        if row is None:
            raise TradingError("Cycle does not exist")
        row.status, row.payload = cycle.status, json_value(cycle)
        self._session.flush()

    def recent(self, limit: int) -> tuple[Cycle, ...]:
        rows = self._session.scalars(select(CycleRow).order_by(CycleRow.slot.desc()).limit(limit))
        return tuple(read_cycle(r.payload) for r in rows)

    def unresolved(self) -> tuple[Cycle, ...]:
        # All submitted non-terminal states block further orders.
        terminal = (
            "observing",
            "blocked",
            "error",
            "previewed",
            "filled",
            "cancelled",
            "expired",
            "failed",
            "rejected",
        )
        rows = self._session.scalars(select(CycleRow).where(CycleRow.status.not_in(terminal)))
        return tuple(read_cycle(r.payload) for r in rows)

    def enabled(self) -> bool:
        row = self._session.get(ControlRow, 1)
        return row is not None and row.enabled

    def set_enabled(self, enabled: bool) -> None:
        row = self._session.get(ControlRow, 1)
        if row is None:
            self._session.add(ControlRow(id=1, enabled=enabled))
        else:
            row.enabled = enabled
        self._session.flush()


class MysqlExecutionGuard:
    """Dedicated autocommit connection owns the named lock; connection loss fails closed."""

    def __init__(self, connection: Connection, stop: Event | None = None) -> None:
        self._connection = connection
        self._stop = stop
        self._owner = int(connection.scalar(text("SELECT CONNECTION_ID()")))
        if connection.scalar(text("SELECT GET_LOCK('jev_trader_execution', 0)")) != 1:
            raise TradingError("Another trading worker holds the execution lock")

    def check(self) -> None:
        if self._stop is not None and self._stop.is_set():
            raise TradingError("Worker is shutting down; no new orders allowed")
        owner = self._connection.scalar(text("SELECT IS_USED_LOCK('jev_trader_execution')"))
        if owner != self._owner:
            raise TradingError("Execution lock lost; restart worker after checking orders")
