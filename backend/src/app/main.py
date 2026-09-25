"""FastAPI application entry point."""

from fastapi import FastAPI

from app.users.adapters.http.router import user_router


def create_app() -> FastAPI:
    """Create the HTTP adapter application."""
    app = FastAPI()
    app.include_router(user_router)
    return app


app = create_app()
