"""SQLAlchemy primitives kept at the infrastructure boundary."""

from collections.abc import Callable

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    """Base class for persistence records."""


def create_session_factory(database_url: str) -> Callable[[], Session]:
    """Build a short-lived SQLAlchemy session factory for the configured database."""
    engine = create_engine(database_url, pool_pre_ping=True)
    return sessionmaker(bind=engine, expire_on_commit=False)


def get_session() -> Session:
    """FastAPI dependency — composition root provides the session.

    This is the only place that creates a ``Session`` directly.
    All other layers receive it via DI from the composition root.
    """
    raise NotImplementedError("Composition root must override get_session dependency")
