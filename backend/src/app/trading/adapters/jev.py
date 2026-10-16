from decimal import Decimal

import httpx
from pydantic import BaseModel, ConfigDict

from app.trading.adapters.serialization import json_value
from app.trading.domain.models import Action, Decision, Policy, Snapshot, TradingError


class ChoiceAnswer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    type: str
    choice: Action
    confidence: Decimal
    probabilities: dict[Action, Decimal]


class JevTraderModel:
    def __init__(self, client: httpx.Client, api_key: str, model: str) -> None:
        self._http, self._key, self._model = client, api_key, model

    def decide(self, snapshot: Snapshot, policy: Policy) -> Decision:
        try:
            response = self._http.post(
                "https://api.typesafe.ai/v1/systemone",
                headers={"Authorization": f"Bearer {self._key}"},
                json={
                    "model": self._model,
                    "state": {
                        "market_and_account": json_value(snapshot),
                        "execution_policy": json_value(policy),
                        "context": "Personal USD futures trading with a 5x leverage target. "
                        "60 closed 1-minute OHLCV candles cover the last hour. "
                        "Position uses signed contracts; contract_size gives underlying units. "
                        "Long buys one budget-sized increment, short sells one increment. "
                        "An opposite action reduces the existing position without flipping it "
                        "in the same order. Hold leaves the position unchanged. "
                        "Consider fees, current exposure, uncertainty, and liquidation risk. "
                        "The model cannot change size, leverage, instrument, or risk limits.",
                    },
                    "questions": {
                        "trade": {
                            "type": "choice",
                            "instructions": "Which trading action is justified now? "
                            "Choose hold unless the evidence justifies costs and risk.",
                            "criteria": {
                                "long": "Buy a futures increment, or reduce an existing short.",
                                "short": "Sell a futures increment, or reduce an existing long.",
                                "hold": "Do not place any order; keep current exposure unchanged.",
                            },
                        }
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
            answer = ChoiceAnswer.model_validate(data["answers"]["trade"])
            if answer.type != "choice" or set(answer.probabilities) != set(Action):
                raise ValueError("Invalid choice schema")
            return Decision(
                answer.choice,
                answer.confidence,
                answer.probabilities[Action.LONG],
                answer.probabilities[Action.SHORT],
                answer.probabilities[Action.HOLD],
                str(data["model"]),
            )
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as error:
            raise TradingError("Jev unavailable or returned an invalid typed decision") from error
