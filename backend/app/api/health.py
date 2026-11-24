from typing import Literal, cast

from fastapi import APIRouter, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine

from app.database.session import ping_database

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]


class ReadyResponse(BaseModel):
    status: Literal["ready", "unavailable"]
    database: Literal["ok", "unreachable"]


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get(
    "/ready",
    response_model=ReadyResponse,
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ReadyResponse}},
)
async def ready(request: Request, response: Response) -> ReadyResponse:
    engine = cast(AsyncEngine, request.app.state.engine)
    try:
        await ping_database(engine)
    except (SQLAlchemyError, OSError):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadyResponse(status="unavailable", database="unreachable")
    return ReadyResponse(status="ready", database="ok")
