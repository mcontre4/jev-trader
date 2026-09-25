"""User aggregate."""

from dataclasses import dataclass

from app.users.domain.user_id import UserId


@dataclass(frozen=True, slots=True)
class User:
    """A registered application user."""

    id: UserId
    email: str
    first_name: str
    last_name: str
