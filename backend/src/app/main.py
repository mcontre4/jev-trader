"""Personal trading terminal composition root."""

from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.trading.adapters.http import terminal_router
from app.trading.adapters.settings import TradingSettings
from app.trading.composition import TradingRuntime


def create_app(settings: TradingSettings | None = None) -> FastAPI:
    runtime = TradingRuntime(settings or TradingSettings())

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        runtime.start()
        try:
            yield
        finally:
            runtime.close()

    app = FastAPI(
        title="Jev Trader", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None
    )
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "testserver"]
    )
    app.include_router(
        terminal_router(
            runtime.settings.terminal_token.get_secret_value(),
            runtime.terminal,
            runtime.execution,
            runtime.health,
        )
    )

    @app.get("/api/health")
    def health() -> dict[str, bool]:
        return {"configured": runtime.settings.configured}

    @app.exception_handler(Exception)
    async def unavailable(request: Request, error: Exception) -> JSONResponse:
        return JSONResponse(
            {"detail": "Service unavailable; check server configuration"}, status_code=503
        )

    @app.middleware("http")
    async def security_headers(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'"
        )
        return response

    frontend = Path(__file__).resolve().parents[3] / "frontend" / "dist"
    if frontend.is_dir():
        app.mount("/", StaticFiles(directory=frontend, html=True), name="terminal")
    return app


app = create_app()
