"""PostgreSQL implementation of the user repository port."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.users.adapters.postgres.models import UserRecord
from app.users.domain.user import User
from app.users.domain.user_id import UserId


class PostgresUserRepository:
    """Translate between user aggregates and SQLAlchemy records."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_id(self, user_id: UserId) -> User | None:
        record = self._session.get(UserRecord, str(user_id))
        return self._to_domain(record) if record is not None else None

    def get_by_email(self, email: str) -> User | None:
        statement = select(UserRecord).where(UserRecord.email == email)
        record = self._session.scalar(statement)
        return self._to_domain(record) if record is not None else None

    def add(self, user: User) -> None:
        self._session.add(
            UserRecord(
                id=str(user.id),
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
            )
        )

    @staticmethod
    def _to_domain(record: UserRecord) -> User:
        return User(
            id=UserId(record.id),
            email=record.email,
            first_name=record.first_name,
            last_name=record.last_name,
        )
