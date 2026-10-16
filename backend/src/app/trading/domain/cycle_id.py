from dataclasses import dataclass
from typing import ClassVar

from app.shared.domain.prefixed_uuid import PrefixedUuid


@dataclass(frozen=True, slots=True)
class CycleId(PrefixedUuid):
    prefix: ClassVar[str] = "cycle_"
