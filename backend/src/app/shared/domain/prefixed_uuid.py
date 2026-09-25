"""Domain value-object base for prefixed UUID identifiers."""

from dataclasses import dataclass
from typing import ClassVar, Self
from uuid import UUID, uuid4


@dataclass(frozen=True, slots=True)
class PrefixedUuid:
    """A canonical identifier in a subclass-defined ``<prefix><UUID>`` format."""

    value: str

    prefix: ClassVar[str]

    def __post_init__(self) -> None:
        message = f"ID must use the {self.prefix}<UUID> format."
        if not self.value.startswith(self.prefix):
            raise ValueError(message)

        try:
            canonical_uuid = UUID(self.value.removeprefix(self.prefix))
        except ValueError as error:
            raise ValueError(message) from error

        if self.value != f"{self.prefix}{canonical_uuid}":
            raise ValueError(message)

    @classmethod
    def new(cls) -> Self:
        """Generate an identifier using the subclass's prefix."""
        return cls(f"{cls.prefix}{uuid4()}")

    def __str__(self) -> str:
        return self.value
