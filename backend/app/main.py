from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import jwt
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.router import api_router
from app.config import get_settings
from app.core.logging import configure_logging
from app.core.middleware import RequestIDMiddleware
from app.database.session import build_engine, build_session_factory


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings.log_level)

    engine = build_engine(settings.database_runtime_url)
    app.state.engine = engine
    app.state.session_factory = build_session_factory(engine)
    app.state.jwks_client = jwt.PyJWKClient(settings.supabase_jwks_url)

    try:
        yield
    finally:
        await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="AI Mathematics Tutor API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestIDMiddleware)

    app.include_router(health_router)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
