"""FastAPI routes for the users domain.

Routes translate HTTP input into users application-service input. They must not
contain business logic.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.shared.domain.id_generator import IdGenerator
from app.shared.infrastructure.database import get_session
from app.shared.infrastructure.sqlalchemy_unit_of_work import SqlAlchemyUnitOfWork
from app.shared.infrastructure.uuid_id_generator import UuidIdGenerator
from app.users.adapters.postgres.user_repository import PostgresUserRepository
from app.users.application.create_user import CreateUser, CreateUserRequest, CreateUserResponse
from app.users.application.errors import EmailAlreadyRegisteredError


class CreateUserHttpRequest(BaseModel):
    """Transport model — validated at the adapter boundary."""

    email: EmailStr
    first_name: str
    last_name: str


class CreateUserHttpResponse(BaseModel):
    """Transport model — mapped from the application Response DTO."""

    id: str
    email: str
    first_name: str
    last_name: str


def _map_to_http(response: CreateUserResponse) -> CreateUserHttpResponse:
    return CreateUserHttpResponse(
        id=str(response.id),
        email=response.email,
        first_name=response.first_name,
        last_name=response.last_name,
    )


user_router = APIRouter(prefix="/users", tags=["users"])


@user_router.post("", response_model=CreateUserHttpResponse, status_code=201)
def create_user(
    payload: CreateUserHttpRequest,
    session: Session = Depends(get_session),
) -> CreateUserHttpResponse:
    """Translate HTTP input -> application Request DTO -> Response DTO -> HTTP."""
    id_generator: IdGenerator = UuidIdGenerator()
    use_case = CreateUser(
        users=PostgresUserRepository(session),
        unit_of_work=SqlAlchemyUnitOfWork(session),
        id_generator=id_generator,
    )
    try:
        response = use_case.execute(
            CreateUserRequest(
                email=str(payload.email),
                first_name=payload.first_name,
                last_name=payload.last_name,
            )
        )
    except EmailAlreadyRegisteredError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _map_to_http(response)
