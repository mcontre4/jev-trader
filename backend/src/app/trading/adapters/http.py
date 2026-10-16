import hmac
import json
from collections.abc import Callable, Iterator
from contextlib import AbstractContextManager
from dataclasses import asdict
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict

from app.trading.application.terminal import (
    GetTerminal,
    GetTerminalRequest,
    SetExecution,
    SetExecutionRequest,
)


class ExecutionInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    enabled: bool


def terminal_router(
    token: str,
    get_terminal: Callable[[], AbstractContextManager[GetTerminal]],
    set_execution: Callable[[], AbstractContextManager[SetExecution]],
    health: Callable[[], dict[str, Any]],
) -> APIRouter:
    def authorize(authorization: Annotated[str | None, Header()] = None) -> None:
        if not token:
            raise HTTPException(503, "Configure the server .env first")
        if not authorization or not hmac.compare_digest(authorization, f"Bearer {token}"):
            raise HTTPException(401, "Invalid terminal token")

    router = APIRouter(prefix="/api", dependencies=[Depends(authorize)])

    def query() -> Iterator[GetTerminal]:
        with get_terminal() as use_case:
            yield use_case

    def control() -> Iterator[SetExecution]:
        with set_execution() as use_case:
            yield use_case

    @router.get("/terminal")
    def terminal(use_case: Annotated[GetTerminal, Depends(query)]) -> dict[str, Any]:
        result: dict[str, Any] = json.loads(use_case.execute(GetTerminalRequest()).payload)
        return {**result, "worker": health()}

    @router.post("/execution")
    def execution(
        body: ExecutionInput, use_case: Annotated[SetExecution, Depends(control)]
    ) -> dict[str, bool]:
        return asdict(use_case.execute(SetExecutionRequest(body.enabled)))

    return router
