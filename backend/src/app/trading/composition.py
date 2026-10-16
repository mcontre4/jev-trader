"""Own infrastructure lifecycle, operation scopes, and the one local worker."""

import argparse
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import UTC, datetime
from threading import Event, Lock, Thread
from typing import Any

import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from sqlalchemy import create_engine, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.shared.infrastructure.sqlalchemy_unit_of_work import SqlAlchemyUnitOfWork
from app.shared.infrastructure.system_clock import SystemClock
from app.shared.infrastructure.uuid_id_generator import UuidIdGenerator
from app.trading.adapters.coinbase import CoinbaseExchange
from app.trading.adapters.jev import JevTraderModel
from app.trading.adapters.persistence import (
    ControlRow,
    MysqlExecutionGuard,
    MysqlTradingRepository,
    TradingBase,
)
from app.trading.adapters.settings import TradingSettings
from app.trading.application.run_cycle import RunCycle, RunCycleRequest
from app.trading.application.terminal import GetTerminal, SetExecution
from app.trading.domain.models import Policy


@dataclass
class TradingRuntime:
    settings: TradingSettings
    policy: Policy = field(init=False)
    engine: Engine | None = field(default=None, init=False)
    _stop: Event = field(default_factory=Event, init=False)
    _thread: Thread | None = field(default=None, init=False)
    _state_lock: Lock = field(default_factory=Lock, init=False)
    _health: dict[str, Any] = field(default_factory=lambda: {"status": "unconfigured"}, init=False)

    def __post_init__(self) -> None:
        s = self.settings
        self.policy = Policy(
            margin_budget=s.trading_margin_usd,
            max_position_notional=s.trading_max_position_usd,
            max_daily_loss=s.trading_max_daily_loss_usd,
            min_confidence=s.trading_min_confidence,
            fee_reserve=s.trading_fee_reserve_usd,
            slippage_bps=s.trading_slippage_bps,
        )

    def start(self) -> None:
        if not self.settings.configured:
            return
        try:
            key = serialization.load_pem_private_key(
                self.settings.coinbase_api_secret.get_secret_value().replace("\\n", "\n").encode(),
                password=None,
            )
            if not isinstance(key, ec.EllipticCurvePrivateKey) or not isinstance(
                key.curve, ec.SECP256R1  # gitleaks:allow -- public curve type
            ):
                raise ValueError("Unsupported key")
        except (ValueError, TypeError):
            raise RuntimeError("Coinbase requires a valid ECDSA P-256 PEM private key") from None
        self.engine = create_engine(
            self.settings.database_url.get_secret_value(),
            pool_pre_ping=True,
            pool_recycle=1800,
            connect_args={"connect_timeout": 5},
        )
        # Fail startup if migrations were not applied. Do not silently fall back to memory.
        with Session(self.engine) as session:
            if session.scalar(select(ControlRow.id).where(ControlRow.id == 1)) is None:
                raise RuntimeError("Initialize the trading database before starting")
        self._thread = Thread(target=self._run, name="jev-trader", daemon=True)
        self._thread.start()

    def close(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=60)
        if self.engine:
            self.engine.dispose()

    def health(self) -> dict[str, Any]:
        with self._state_lock:
            return dict(self._health)

    def _state(self, **values: Any) -> None:
        with self._state_lock:
            self._health.update(values)

    def _run(self) -> None:
        assert self.engine is not None
        s, clock = self.settings, SystemClock()
        try:
            with self.engine.connect().execution_options(
                isolation_level="AUTOCOMMIT"
            ) as connection:
                guard = MysqlExecutionGuard(connection, self._stop)
                with httpx.Client(timeout=httpx.Timeout(8, connect=3), trust_env=False) as http:
                    exchange = CoinbaseExchange(
                        http,
                        s.coinbase_api_key.get_secret_value(),
                        s.coinbase_api_secret.get_secret_value().replace("\\n", "\n"),
                        clock,
                        s.trading_asset,
                        s.trading_product_id,
                    )
                    trader = JevTraderModel(http, s.jev_api_key.get_secret_value(), s.jev_model)
                    while not self._stop.is_set():
                        try:
                            with Session(self.engine) as session:
                                use_case = RunCycle(
                                    exchange,
                                    trader,
                                    MysqlTradingRepository(session),
                                    SqlAlchemyUnitOfWork(session),
                                    clock,
                                    UuidIdGenerator(),
                                    self.policy,
                                    guard,
                                )
                                result = use_case.execute(RunCycleRequest(s.trading_mode))
                            self._state(
                                status="running",
                                last_cycle_at=clock.now().isoformat(),
                                last_result=result.status,
                                error=None,
                            )
                        except Exception:
                            # Never log exception payloads containing credentials.
                            self._state(
                                status="error", error="Cycle failed; inspect service configuration"
                            )
                        delay = 30 - (clock.now().timestamp() % 30)
                        self._state(
                            next_cycle_at=datetime.fromtimestamp(
                                clock.now().timestamp() + delay, UTC
                            ).isoformat()
                        )
                        self._stop.wait(delay)
        except Exception:
            self._state(
                status="stopped", error="Worker could not obtain or retain database execution lock"
            )

    @contextmanager
    def terminal(self) -> Iterator[GetTerminal]:
        if self.engine is None:
            raise RuntimeError("Trading service is not configured")
        with Session(self.engine) as session:
            yield GetTerminal(
                MysqlTradingRepository(session),
                SqlAlchemyUnitOfWork(session),
                self.policy,
                self.settings.trading_mode,
            )

    @contextmanager
    def execution(self) -> Iterator[SetExecution]:
        if self.engine is None:
            raise RuntimeError("Trading service is not configured")
        with Session(self.engine) as session:
            yield SetExecution(MysqlTradingRepository(session), SqlAlchemyUnitOfWork(session))


def initialize_database(settings: TradingSettings) -> None:
    engine = create_engine(settings.database_url.get_secret_value())
    try:
        TradingBase.metadata.create_all(engine)
        with Session(engine) as session, session.begin():
            if session.get(ControlRow, 1) is None:
                session.add(ControlRow(id=1, enabled=settings.trading_autostart))
    finally:
        engine.dispose()


def cli() -> None:
    parser = argparse.ArgumentParser(description="Initialize the personal trading MySQL schema")
    parser.add_argument("--init-db", action="store_true", required=True)
    parser.parse_args()
    initialize_database(TradingSettings())


if __name__ == "__main__":
    cli()
