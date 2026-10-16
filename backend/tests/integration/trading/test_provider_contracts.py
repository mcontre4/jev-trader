import json
from decimal import Decimal

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from fakes.trading.services import NOW, FakeClock, decision, market

from app.trading.adapters.coinbase import CoinbaseExchange
from app.trading.adapters.jev import JevTraderModel
from app.trading.domain.models import Action, Policy, TradingError, plan_order

pytestmark = pytest.mark.integration


def test_coinbase_signed_snapshot_and_order_contract(private_key, coinbase_responses):
    calls = []
    key = serialization.load_pem_private_key(private_key.encode(), password=None)

    def provider(request):
        suffix = request.url.path.removeprefix("/api/v3/brokerage")
        claims = jwt.decode(
            request.headers["authorization"].removeprefix("Bearer "),
            key.public_key(),
            algorithms=["ES256"],
            options={"verify_exp": False, "verify_nbf": False},
        )
        assert claims["uri"] == f"{request.method} api.coinbase.com{request.url.path}"
        assert claims["iss"] == "cdp" and claims["exp"] - claims["nbf"] == 120
        if suffix.endswith("candles"):
            assert request.url.params["granularity"] == "ONE_MINUTE"
            assert int(request.url.params["end"]) - int(request.url.params["start"]) == 3600
        calls.append((suffix, json.loads(request.content) if request.content else None))
        return httpx.Response(200, json=coinbase_responses[suffix])

    with httpx.Client(transport=httpx.MockTransport(provider)) as client:
        adapter = CoinbaseExchange(
            client, "test-key", private_key, FakeClock(), "BTC", "BTC-TEST-CDE"
        )
        state = adapter.snapshot()
        assert state == market()
        plan = plan_order(state, decision(), Policy(), NOW)
        preview = adapter.preview(plan)
        result = adapter.submit("cycle_1", plan, preview.id)
        assert result.status == "PENDING" and result.filled_contracts == 0
        body = calls[-1][1]
        assert body["order_configuration"]["limit_limit_fok"]["base_size"] == "4"
        assert body["client_order_id"] == "cycle_1" and body["preview_id"] == "preview-1"
        assert "leverage" not in body  # CFM leverage is exchange-set.


def test_product_discovery_ignores_wrong_venue(private_key, coinbase_responses):
    product = coinbase_responses["/products/BTC-TEST-CDE"]
    wrong = {
        **product,
        "future_product_details": {**product["future_product_details"], "venue": "INTX"},
    }

    def provider(request):
        suffix = request.url.path.removeprefix("/api/v3/brokerage")
        if suffix == "/products":
            return httpx.Response(200, json={"products": [wrong, product]})
        return httpx.Response(200, json=coinbase_responses[suffix])

    with httpx.Client(transport=httpx.MockTransport(provider)) as client:
        adapter = CoinbaseExchange(client, "test-key", private_key, FakeClock(), "BTC")
        assert adapter.snapshot().product.id == "BTC-TEST-CDE"


@pytest.mark.parametrize(
    "change", [{"leverage": "4"}, {"order_margin_total": "50"}, {"warning": ["MARGIN_WARNING"]}]
)
def test_preview_rejects_incompatible_leverage_or_cost(private_key, coinbase_responses, change):
    data = {**coinbase_responses["/orders/preview"], **change}
    with httpx.Client(
        transport=httpx.MockTransport(lambda r: httpx.Response(200, json=data))
    ) as client:
        adapter = CoinbaseExchange(client, "test-key", private_key, FakeClock(), "BTC")
        with pytest.raises(TradingError):
            adapter.preview(plan_order(market(), decision(), Policy(), NOW))


def test_order_reconciliation_distinguishes_fills_and_missing_orders(private_key):
    calls = []

    def provider(request):
        calls.append(request)
        if "batch" in request.url.path:
            if "cursor" not in request.url.params:
                return httpx.Response(200, json={"orders": [], "has_next": True, "cursor": "next"})
            return httpx.Response(200, json={"orders": [], "has_next": False})
        return httpx.Response(
            200,
            json={
                "order": {
                    "client_order_id": "cycle_1",
                    "order_id": "order-1",
                    "status": "FILLED",
                    "filled_size": "4",
                    "average_filled_price": "1000",
                    "total_fees": ".01",
                }
            },
        )

    with httpx.Client(transport=httpx.MockTransport(provider)) as client:
        adapter = CoinbaseExchange(client, "test-key", private_key, FakeClock(), "BTC")
        result = adapter.reconcile("cycle_1", "order-1")
        assert result.terminal and result.filled_contracts == 4 and result.fees == Decimal(".01")
        assert adapter.reconcile("missing", None) is None
        assert len(calls) == 3


@pytest.mark.parametrize("invalid", [False, True])
def test_jev_context_and_typed_choice_contract(invalid):
    def provider(request):
        assert request.url == "https://api.typesafe.ai/v1/systemone"
        body = json.loads(request.content)
        assert body["state"]["execution_policy"]["leverage"] == "5"
        assert len(body["state"]["market_and_account"]["candles"]) == 60
        assert set(body["questions"]["trade"]["criteria"]) == {"long", "short", "hold"}
        assert "key" not in body["state"]
        return httpx.Response(
            200,
            json={
                "model": "jev-test",
                "answers": {
                    "trade": {
                        "type": "choice",
                        "choice": "transfer_money" if invalid else "hold",
                        "confidence": 0.8,
                        "probabilities": {"long": 0.1, "short": 0.1, "hold": 0.8},
                    }
                },
            },
        )

    with httpx.Client(transport=httpx.MockTransport(provider)) as client:
        model = JevTraderModel(client, "test-key", "jev-latest")
        if invalid:
            with pytest.raises(TradingError):
                model.decide(market(), Policy())
        else:
            assert model.decide(market(), Policy()).action == Action.HOLD


def test_provider_errors_do_not_expose_secrets(private_key):
    with httpx.Client(
        transport=httpx.MockTransport(lambda r: httpx.Response(401, text="secret"))
    ) as client:
        for action in (
            lambda: CoinbaseExchange(client, "key", private_key, FakeClock(), "BTC").snapshot(),
            lambda: JevTraderModel(client, "key", "jev-latest").decide(market(), Policy()),
        ):
            with pytest.raises(TradingError) as failure:
                action()
            assert "secret" not in str(failure.value)
