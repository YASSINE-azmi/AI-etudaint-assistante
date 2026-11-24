from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.concurrency import run_in_threadpool

from app.config import get_settings

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str | None
    role: str


def _decode_token(token: str, request: Request) -> dict[str, Any]:
    settings = get_settings()
    jwks_client: jwt.PyJWKClient = request.app.state.jwks_client
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
        issuer=settings.supabase_issuer,
        options={"require": ["exp", "sub", "aud", "iss"]},
    )


def _role_from_claims(payload: dict[str, Any]) -> str:
    app_metadata = payload.get("app_metadata")
    if isinstance(app_metadata, dict):
        candidate = app_metadata.get("role")
        if isinstance(candidate, str) and candidate in {"student", "reviewer", "admin"}:
            return candidate
    return "student"


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    try:
        payload = await run_in_threadpool(_decode_token, credentials.credentials, request)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing a subject",
        )

    email = payload.get("email")
    return AuthenticatedUser(
        id=subject,
        email=email if isinstance(email, str) else None,
        role=_role_from_claims(payload),
    )
