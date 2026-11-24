from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.dependencies import AuthenticatedUser, get_current_user

router = APIRouter(tags=["me"])


class MeResponse(BaseModel):
    id: str
    email: str | None
    role: str
    academic_track: str = "TCS"


@router.get("/me", response_model=MeResponse)
async def me(user: AuthenticatedUser = Depends(get_current_user)) -> MeResponse:
    return MeResponse(id=user.id, email=user.email, role=user.role)
