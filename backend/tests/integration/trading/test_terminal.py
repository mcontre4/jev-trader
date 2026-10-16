from contextlib import contextmanager

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
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.shared.infrastructure.sqlalchemy_unit_of_work import SqlAlchemyUnitOfWork
from app.trading.adapters.http import terminal_router
from app.trading.adapters.persistence import MysqlTradingRepository
from app.trading.application.run_cycle import RunCycle, RunCycleRequest
from app.trading.application.terminal import GetTerminal, SetExecution
from app.trading.domain.models import Policy

pytestmark = pytest.mark.integration
TOKEN = "integration-test-terminal-token-123456789"


def test_full_cycle_mysql_to_authenticated_terminal_and_pause(clean_mysql):
    # Real use cases + MySQL + HTTP adapter, injected external provider ports.
    fake_uow = FakeUnitOfWork(InMemoryTradingRepository())
    exchange, model = RecordingExchange(fake_uow), FakeTrader(fake_uow)
    with Session(clean_mysql) as session:
        result = RunCycle(
            exchange,
            model,
            MysqlTradingRepository(session),
            SqlAlchemyUnitOfWork(session),
            FakeClock(),
            FakeIds(),
            Policy(),
            FakeGuard(),
        ).execute(RunCycleRequest("preview"))

    @contextmanager
    def query():
        with Session(clean_mysql) as session:
            yield GetTerminal(
                MysqlTradingRepository(session), SqlAlchemyUnitOfWork(session), Policy(), "preview"
            )

    @contextmanager
    def control():
        with Session(clean_mysql) as session:
            yield SetExecution(MysqlTradingRepository(session), SqlAlchemyUnitOfWork(session))

    app = FastAPI()
    app.include_router(terminal_router(TOKEN, query, control, lambda: {"status": "running"}))
    with TestClient(app) as client:
        assert client.get("/api/terminal").status_code == 401
        assert client.post("/api/execution", json={"enabled": False}).status_code == 401
        auth = {"Authorization": f"Bearer {TOKEN}"}
        response = client.get("/api/terminal", headers=auth)
        assert response.status_code == 200
        cycle = response.json()["cycles"][0]
        assert cycle["id"] == result.cycle_id and cycle["status"] == "previewed"
        assert len(cycle["snapshot"]["candles"]) == 60
        assert cycle["snapshot"]["available_margin"] == "100"
        assert (
            client.post("/api/execution", headers=auth, json={"enabled": False}).status_code == 200
        )
        assert not client.get("/api/terminal", headers=auth).json()["enabled"]
        assert (
            client.post("/api/execution", headers=auth, json={"enabled": "false"}).status_code
            == 422
        )
        assert (
            client.post(
                "/api/execution", headers=auth, json={"enabled": True, "amount": 1000}
            ).status_code
            == 422
        )
        assert TOKEN not in response.text


def test_unconfigured_app_and_host_protection():
    from app.main import create_app
    from app.trading.adapters.settings import TradingSettings

    settings = TradingSettings(_env_file=None)
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/health").json() == {"configured": False}
        assert client.get("/api/terminal").status_code == 503
        assert client.post("/users", json={}).status_code in {404, 405}
        assert client.get("/api/health", headers={"Host": "attacker.example"}).status_code == 400
        response = client.get("/api/health")
        assert response.headers["cache-control"] == "no-store"
        assert "frame-ancestors 'none'" in response.headers["content-security-policy"]


def test_invalid_coinbase_key_fails_startup_without_disclosing_secret():
    from app.trading.adapters.settings import TradingSettings
    from app.trading.composition import TradingRuntime

    settings = TradingSettings(
        _env_file=None,
        database_url="mysql+pymysql://unused",
        coinbase_api_key="test-key",
        coinbase_api_secret="private-secret-value",
        jev_api_key="test-jev",
        terminal_token=TOKEN,
    )
    with pytest.raises(RuntimeError, match="ECDSA P-256") as failure:
        TradingRuntime(settings).start()
    assert "private-secret-value" not in str(failure.value)
