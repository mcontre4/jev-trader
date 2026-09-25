# Backend

Reusable FastAPI modular-monolith skeleton using hexagonal architecture.

## Layout

- `src/app/<domain>/domain`: entities, value objects, domain services, and domain errors.
- `src/app/<domain>/application`: one application service per use case.
- `src/app/<domain>/ports`: repository and external-service interfaces.
- `src/app/<domain>/adapters`: incoming HTTP and outgoing Postgres, Redis, and third-party implementations for that domain.
- `src/app/composition.py`: composition root that binds ports to adapter implementations.
- `migrations`: Alembic database migrations for the PostgreSQL adapter.
- `tests`: mirrors `src/app` after the test-type split; for example, user tests live under `tests/unit/users` and `tests/integration/users`.

Run the API from this directory with `uvicorn app.main:app --reload` after installing the project dependencies.
