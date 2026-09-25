"""User application-service assembly from injected dependencies."""

from app.shared.application.unit_of_work import UnitOfWork
from app.shared.domain.id_generator import IdGenerator
from app.users.application.create_user import CreateUser
from app.users.ports.user_repository import UserRepository


def build_create_user(
    users: UserRepository,
    unit_of_work: UnitOfWork,
    id_generator: IdGenerator,
) -> CreateUser:
    """Assemble the create-user use case from its injected ports."""
    return CreateUser(users=users, unit_of_work=unit_of_work, id_generator=id_generator)
