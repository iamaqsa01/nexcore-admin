from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ...auth import require_service_token
from ...config import get_settings
from ...db import get_session
from ...subscriptions.repository import lock_ai_receptionist_subscription
from .authorization import (
    AuthorizationRepository,
    authorize_ai_receptionist,
)
from .quota import compute_reservation_seconds
from .repository import (
    SqlAlchemyAuthorizationRepository,
    complete_session,
    release_session,
    reserve_session,
)

router = APIRouter(dependencies=[Depends(require_service_token)])


async def get_authorization_repo(
    session: AsyncSession = Depends(get_session),
) -> AuthorizationRepository:
    """Overridable in tests to inject an in-memory repository."""
    return SqlAlchemyAuthorizationRepository(session)


# --- schemas ----------------------------------------------------------------

class AuthorizeRequest(BaseModel):
    client_id: str = Field(min_length=1)


class AuthorizeResponse(BaseModel):
    allowed: bool
    client_id: str
    subscription_id: str
    quota_minutes: int
    quota_seconds: int
    used_seconds: int
    remaining_seconds: int


class StartSessionRequest(BaseModel):
    client_id: str = Field(min_length=1)
    estimated_seconds: int | None = Field(default=None, ge=0)
    external_call_id: str | None = Field(default=None, max_length=191)


class StartSessionResponse(BaseModel):
    allowed: bool = True
    session_id: str
    call_id: str
    subscription_id: str
    reserved_seconds: int
    remaining_seconds: int
    started_at: datetime


class CompleteSessionRequest(BaseModel):
    duration_seconds: int = Field(ge=0)
    status: Literal["COMPLETED", "FAILED", "MISSED"] = "COMPLETED"


class CompleteSessionResponse(BaseModel):
    session_id: str
    status: str
    duration_seconds: int
    already_final: bool


# --- endpoints ------------------------------------------------------------

@router.post("/authorize", response_model=AuthorizeResponse)
async def authorize(
    payload: AuthorizeRequest,
    repo: AuthorizationRepository = Depends(get_authorization_repo),
) -> AuthorizeResponse:
    """Pre-flight ALLOW/BLOCK check. No reservation, no writes — safe to call
    repeatedly. Raises 4xx (`AuthorizationError`) to block."""
    decision = await authorize_ai_receptionist(payload.client_id, repo)
    return AuthorizeResponse(
        allowed=True,
        client_id=decision.client_id,
        subscription_id=decision.subscription_id,
        quota_minutes=decision.quota_minutes,
        quota_seconds=decision.quota_seconds,
        used_seconds=decision.used_seconds,
        remaining_seconds=decision.remaining_seconds,
    )


@router.post("/sessions", response_model=StartSessionResponse)
async def start_session(
    payload: StartSessionRequest,
    session: AsyncSession = Depends(get_session),
) -> StartSessionResponse:
    """Authorize AND reserve capacity for a new session.

    The whole check-then-reserve runs in one transaction that first takes a
    ``FOR UPDATE`` lock on the subscription row, so concurrent starts are
    serialised and cannot both slip under the same remaining quota.
    """
    settings = get_settings()
    async with session.begin():
        # Acquire the row lock BEFORE reading usage.
        await lock_ai_receptionist_subscription(session, payload.client_id)

        repo = SqlAlchemyAuthorizationRepository(session)
        decision = await authorize_ai_receptionist(payload.client_id, repo)

        estimated = (
            payload.estimated_seconds
            if payload.estimated_seconds is not None
            else settings.default_estimated_session_seconds
        )
        reserved = compute_reservation_seconds(estimated, decision.remaining_seconds)
        reservation = await reserve_session(
            session,
            decision,
            reserved_seconds=reserved,
            external_call_id=payload.external_call_id,
        )

    return StartSessionResponse(
        session_id=reservation.session_id,
        call_id=reservation.call_id,
        subscription_id=decision.subscription_id,
        reserved_seconds=reservation.reserved_seconds,
        remaining_seconds=max(decision.remaining_seconds - reservation.reserved_seconds, 0),
        started_at=reservation.started_at,
    )


@router.post("/sessions/{session_id}/complete", response_model=CompleteSessionResponse)
async def complete(
    session_id: str,
    payload: CompleteSessionRequest,
    session: AsyncSession = Depends(get_session),
) -> CompleteSessionResponse:
    result = await complete_session(
        session,
        session_id,
        duration_seconds=payload.duration_seconds,
        final_status=payload.status,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")
    return CompleteSessionResponse(
        session_id=result.session_id,
        status=result.status,
        duration_seconds=result.duration_seconds,
        already_final=result.already_final,
    )


@router.post("/sessions/{session_id}/release")
async def release(
    session_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    released = await release_session(session, session_id)
    return {"released": released}
