from collections.abc import Iterator
from datetime import timedelta
from decimal import Decimal

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fakes.trading.services import NOW, market
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from testcontainers.community.mysql import MySqlContainer

from app.trading.adapters.persistence import ControlRow, TradingBase


@pytest.fixture(scope="session")
def mysql_engine() -> Iterator[Engine]:
    with MySqlContainer("mysql:8.4", dialect="pymysql") as container:
        engine = create_engine(container.get_connection_url(), pool_pre_ping=True)
        TradingBase.metadata.create_all(engine)
        try:
            yield engine
        finally:
            engine.dispose()


@pytest.fixture
def clean_mysql(mysql_engine: Engine) -> Iterator[Engine]:
    with mysql_engine.begin() as connection:
        for table in reversed(TradingBase.metadata.sorted_tables):
            connection.execute(table.delete())
    with Session(mysql_engine) as session, session.begin():
        session.add(ControlRow(id=1, enabled=True))
    yield mysql_engine


@pytest.fixture
def private_key() -> str:
    return (
        ec.generate_private_key(ec.SECP256R1())
        .private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
        .decode()
    )


@pytest.fixture
def coinbase_responses():
    state = market()
    return {
        "/products/BTC-TEST-CDE": {
            "product_id": "BTC-TEST-CDE",
            "product_type": "FUTURE",
            "status": "",
            "price": "1000",
            "base_increment": "1",
            "base_min_size": "1",
            "base_max_size": "10000",
            "price_increment": ".01",
            "quote_currency_id": "USD",
            "is_disabled": False,
            "trading_disabled": False,
            "cancel_only": False,
            "view_only": False,
            "post_only": False,
            "fcm_trading_session_details": {"is_session_open": True},
            "future_product_details": {
                "venue": "cde",
                "contract_size": ".001",
                "contract_root_unit": "BTC",
                "contract_expiry": (NOW + timedelta(days=30)).isoformat(),
                "overnight_margin_rate": {"long_margin_rate": ".2", "short_margin_rate": ".2"},
            },
        },
        "/products/BTC-TEST-CDE/candles": {
            "candles": [
                {
                    "start": str(c.start),
                    **{k: str(getattr(c, k)) for k in ("open", "high", "low", "close", "volume")},
                }
                for c in reversed(state.candles)
            ]
        },
        "/cfm/balance_summary": {
            "balance_summary": {
                k: {"value": str(v), "currency": "USD"}
                for k, v in {
                    "available_margin": Decimal(100),
                    "total_usd_balance": Decimal(100),
                    "daily_realized_pnl": Decimal(0),
                    "unrealized_pnl": Decimal(0),
                }.items()
            }
        },
        "/cfm/positions": {"positions": []},
        "/orders/historical/batch": {"orders": [], "has_next": False},
        "/orders/preview": {
            "errs": [],
            "warning": [],
            "preview_id": "preview-1",
            "commission_total": ".01",
            "order_margin_total": ".8",
            "leverage": "5",
        },
        "/orders": {"success": True, "success_response": {"order_id": "exchange-1"}},
    }
