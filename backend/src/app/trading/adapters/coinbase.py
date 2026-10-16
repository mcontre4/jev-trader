"""Coinbase Advanced Trade CFM boundary. No transfers and no blind order retries."""

import secrets
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any
from urllib.parse import quote

import httpx
import jwt

from app.shared.domain.clock import Clock
from app.trading.domain.models import (
    Candle,
    OrderPlan,
    OrderResult,
    Position,
    Preview,
    Product,
    Snapshot,
    TradingError,
)


class CoinbaseExchange:
    def __init__(
        self,
        client: httpx.Client,
        key_name: str,
        private_key: str,
        clock: Clock,
        asset: str,
        product_id: str = "",
    ) -> None:
        self._http, self._key, self._secret = client, key_name, private_key
        self._clock, self._asset, self._product_id = clock, asset, product_id

    def _request(
        self,
        method: str,
        suffix: str,
        *,
        params: dict[str, Any] | None = None,
        body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        path = "/api/v3/brokerage" + suffix
        now = int(self._clock.now().timestamp())
        token = jwt.encode(
            {
                "sub": self._key,
                "iss": "cdp",
                "nbf": now,
                "exp": now + 120,
                "uri": f"{method} api.coinbase.com{path}",
            },
            self._secret,
            algorithm="ES256",
            headers={"kid": self._key, "nonce": secrets.token_hex()},
        )
        try:
            response = self._http.request(
                method,
                "https://api.coinbase.com" + path,
                params=params,
                json=body,
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            result = response.json()
            if not isinstance(result, dict):
                raise ValueError("Expected object")
            return result
        except (httpx.HTTPError, ValueError) as error:
            raise TradingError(
                "Coinbase request failed; check credentials, eligibility or service"
            ) from error

    def _product(self) -> Product:
        if not self._product_id:
            candidates: list[Product] = []
            for offset in range(0, 10000, 100):
                page = self._request(
                    "GET",
                    "/products",
                    params={"product_type": "FUTURE", "limit": 100, "offset": offset},
                )
                items = page["products"]
                for item in items:
                    try:
                        product = self._map_product(item)
                    except (TradingError, KeyError, ValueError):
                        continue
                    if product.tradable and product.expires_at > self._clock.now() + timedelta(
                        days=1
                    ):
                        candidates.append(product)
                if len(items) < 100:
                    break
            if not candidates:
                raise TradingError(
                    "No eligible USD CFM futures contract found for configured asset"
                )
            # Smallest contract first, then nearest eligible expiry. Pin for this process.
            candidates.sort(
                key=lambda p: (p.contract_size * p.min_size * p.price, p.expires_at, p.id)
            )
            self._product_id = candidates[0].id
        return self._map_product(
            self._request("GET", "/products/" + quote(self._product_id, safe=""))
        )

    def _map_product(self, data: dict[str, Any]) -> Product:
        detail = data["future_product_details"]
        if (
            data["product_type"] != "FUTURE"
            or str(detail["venue"]).upper() != "CDE"
            or data["quote_currency_id"] != "USD"
            or detail["contract_root_unit"].upper() != self._asset
        ):
            raise TradingError("Product is not the configured asset's USD CFM future")
        rates = detail["overnight_margin_rate"]
        tradable = (
            data["status"].lower() in {"", "online"}
            and data["fcm_trading_session_details"]["is_session_open"] is True
            and not any(
                data.get(key, True)
                for key in ("is_disabled", "trading_disabled", "cancel_only", "view_only")
            )
            and not data.get("post_only", False)
        )
        return Product(
            data["product_id"],
            self._asset,
            Decimal(data["price"]),
            Decimal(detail["contract_size"]),
            Decimal(data["base_increment"]),
            Decimal(data["base_min_size"]),
            Decimal(data["base_max_size"]),
            Decimal(data["price_increment"]),
            Decimal(rates["long_margin_rate"]),
            Decimal(rates["short_margin_rate"]),
            tradable,
            datetime.fromisoformat(detail["contract_expiry"].replace("Z", "+00:00")),
        )

    def snapshot(self) -> Snapshot:
        started = self._clock.now()
        product = self._product()
        end = int(started.timestamp()) // 60 * 60
        rows = self._request(
            "GET",
            f"/products/{quote(product.id, safe='')}/candles",
            params={
                "start": str(end - 3600),
                "end": str(end),
                "granularity": "ONE_MINUTE",
                "limit": 60,
            },
        )["candles"]
        candles = tuple(
            sorted(
                (
                    Candle(
                        int(c["start"]),
                        *(Decimal(c[k]) for k in ("open", "high", "low", "close", "volume")),
                    )
                    for c in rows
                    if end - 3600 <= int(c["start"]) < end
                ),
                key=lambda c: c.start,
            )
        )
        balance = self._request("GET", "/cfm/balance_summary")["balance_summary"]

        def usd(key: str) -> Decimal:
            amount = balance[key]
            if amount["currency"] != "USD":
                raise TradingError("Unsupported futures balance currency")
            return Decimal(amount["value"])

        positions = self._request("GET", "/cfm/positions")["positions"]
        position = Position()
        others = False
        for row in positions:
            contracts = Decimal(row["number_of_contracts"])
            if contracts == 0:
                continue
            if row["product_id"] != product.id:
                others = True
                continue
            if row["side"] not in {"LONG", "SHORT"} or contracts < 0:
                raise TradingError("Unknown position side")
            position = Position(
                contracts * (1 if row["side"] == "LONG" else -1),
                Decimal(row["avg_entry_price"]),
                Decimal(row["unrealized_pnl"]),
            )
        # All futures orders, not only this contract. A full page conservatively blocks too.
        orders = self._request(
            "GET",
            "/orders/historical/batch",
            params={"product_type": "FUTURE", "order_status": "OPEN", "limit": 100},
        )["orders"]
        return Snapshot(
            started,
            product,
            candles,
            usd("available_margin"),
            usd("total_usd_balance"),
            usd("daily_realized_pnl") + usd("unrealized_pnl"),
            position,
            len(orders),
            others,
        )

    @staticmethod
    def _payload(plan: OrderPlan) -> dict[str, Any]:
        return {
            "product_id": plan.product_id,
            "side": plan.side,
            "order_configuration": {
                "limit_limit_fok": {
                    "base_size": str(plan.contracts),
                    "limit_price": str(plan.limit_price),
                }
            },
        }

    def preview(self, plan: OrderPlan) -> Preview:
        data = self._request("POST", "/orders/preview", body=self._payload(plan))
        errors = tuple(str(e) for e in data["errs"])
        if errors:
            return Preview("", Decimal(0), errors)
        margin = Decimal(data["order_margin_total"])
        leverage = Decimal(data["leverage"])
        if not margin.is_finite() or margin < 0 or not leverage.is_finite():
            raise TradingError("Invalid Coinbase margin preview")
        if not plan.reducing and (leverage != 5 or margin > plan.margin):
            raise TradingError("Coinbase preview cannot meet the 5x leverage and margin budget")
        if data.get("warning"):
            raise TradingError("Coinbase preview has warnings; execution blocked")
        return Preview(data["preview_id"], Decimal(data["commission_total"]), errors)

    def submit(self, client_id: str, plan: OrderPlan, preview_id: str) -> OrderResult:
        data = self._request(
            "POST",
            "/orders",
            body={**self._payload(plan), "client_order_id": client_id, "preview_id": preview_id},
        )
        if data.get("success") is False:
            return OrderResult("", "REJECTED")
        if data.get("success") is not True:
            raise TradingError("Unrecognized order response")
        order_id = data["success_response"]["order_id"]
        if not order_id:
            raise TradingError("Missing exchange order ID")
        return OrderResult(order_id, "PENDING")

    def reconcile(self, client_id: str, order_id: str | None) -> OrderResult | None:
        if order_id:
            data = self._request("GET", "/orders/historical/" + quote(order_id, safe=""))["order"]
            if data["client_order_id"] != client_id:
                raise TradingError("Order identity mismatch")
            return self._map_order(data)
        cursor = ""
        for _ in range(100):
            params: dict[str, Any] = {"product_type": "FUTURE", "limit": 100}
            if cursor:
                params["cursor"] = cursor
            page = self._request("GET", "/orders/historical/batch", params=params)
            for data in page["orders"]:
                if data["client_order_id"] == client_id:
                    return self._map_order(data)
            if not page.get("has_next"):
                break
            cursor = page["cursor"]
        # Absence does NOT prove rejection. Never resubmit an ambiguous intent.
        return None

    @staticmethod
    def _map_order(data: dict[str, Any]) -> OrderResult:
        return OrderResult(
            data["order_id"],
            data["status"],
            Decimal(data["filled_size"]),
            Decimal(data["average_filled_price"] or "0"),
            Decimal(data["total_fees"] or "0"),
        )
