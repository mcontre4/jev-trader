import json
from dataclasses import asdict, dataclass
from datetime import datetime
from decimal import Decimal

from app.shared.application.unit_of_work import UnitOfWork
from app.trading.domain.models import Policy
from app.trading.ports.services import TradingRepository


def _json_default(value: object) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    raise TypeError("Unsupported terminal value")


@dataclass(frozen=True)
class GetTerminalRequest:
    limit: int = 100


@dataclass(frozen=True)
class GetTerminalResponse:
    payload: str


class GetTerminal:
    def __init__(
        self, repository: TradingRepository, uow: UnitOfWork, policy: Policy, mode: str
    ) -> None:
        self._repo, self._uow, self._policy, self._mode = repository, uow, policy, mode

    def execute(self, request: GetTerminalRequest) -> GetTerminalResponse:
        with self._uow:
            cycles = self._repo.recent(min(200, max(1, request.limit)))
            enabled = self._repo.enabled()
        return GetTerminalResponse(
            json.dumps(
                {
                    "mode": self._mode,
                    "enabled": enabled,
                    "interval_seconds": 30,
                    "policy": asdict(self._policy),
                    "cycles": [{**asdict(c), "id": str(c.id)} for c in cycles],
                },
                default=_json_default,
            )
        )


@dataclass(frozen=True)
class SetExecutionRequest:
    enabled: bool


@dataclass(frozen=True)
class SetExecutionResponse:
    enabled: bool


class SetExecution:
    def __init__(self, repository: TradingRepository, uow: UnitOfWork) -> None:
        self._repo, self._uow = repository, uow

    def execute(self, request: SetExecutionRequest) -> SetExecutionResponse:
        with self._uow:
            self._repo.set_enabled(request.enabled)
            self._uow.commit()
        return SetExecutionResponse(request.enabled)
