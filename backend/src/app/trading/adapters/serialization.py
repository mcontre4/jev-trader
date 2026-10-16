from typing import Any

from pydantic import TypeAdapter

from app.trading.domain.models import Cycle


def json_value(value: Any) -> Any:
    return TypeAdapter(type(value)).dump_python(value, mode="json")


def read_cycle(value: object) -> Cycle:
    return TypeAdapter(Cycle).validate_python(value)
