"""SQLAlchemy wiring for the AI Receptionist module.

- ``SqlAlchemyAuthorizationRepository`` adapts the core repositories to the
  ``AuthorizationRepository`` protocol used by ``authorization.py``.
- ``reserve_session`` / ``complete_session`` / ``release_session`` implement
  the usage-reservation lifecycle on top of the existing ``CallLog`` table
  (no schema change): an authorized session inserts an ``IN_PROGRESS`` row
  pre-filled with an estimated ``durationSeconds`` — that row IS the
  reservation and immediately counts against quota. Completion reconciles it
  with the real duration.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from ...clients.repository import ClientRecord, get_client
from ...config import get_settings
from ...models import call_log as call_log_t
from ...subscriptions.repository import (
    SubscriptionRecord,
    get_ai_receptionist_subscription,
)
from ...usage.repository import get_usage_seconds, resolve_billing_window, utcnow
from .authorization import AuthorizationDecision
from .quota import get_quota_minutes

IN_PROGRESS = "IN_PROGRESS"
FINAL_STATUSES = {"COMPLETED", "FAILED", "MISSED"}


class SqlAlchemyAuthorizationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._settings = get_settings()

    async def get_client(self, identifier: str) -> ClientRecord | None:
        return await get_client(self._session, identifier)

    async def get_ai_receptionist_subscription(
        self, client_pk: str
    ) -> SubscriptionRecord | None:
        return await get_ai_receptionist_subscription(self._session, client_pk)

    async def get_usage_seconds(self, subscription: SubscriptionRecord) -> int:
        start, end = resolve_billing_window(subscription)
        return await get_usage_seconds(
            self._session,
            subscription.id,
            start,
            end,
            reservation_ttl_seconds=self._settings.session_reservation_ttl_seconds,
        )

    async def get_quota_minutes(self, subscription_id: str) -> int | None:
        return await get_quota_minutes(self._session, subscription_id)


@dataclass(frozen=True)
class SessionReservation:
    session_id: str
    call_id: str
    reserved_seconds: int
    started_at: datetime


async def reserve_session(
    session: AsyncSession,
    decision: AuthorizationDecision,
    *,
    reserved_seconds: int,
    external_call_id: str | None,
) -> SessionReservation:
    """Insert the IN_PROGRESS CallLog that reserves ``reserved_seconds``.

    Call this inside the same transaction that locked the subscription row.
    """
    now = utcnow()
    session_id = f"cs_{uuid.uuid4().hex}"
    call_id = external_call_id or f"air_{uuid.uuid4().hex}"

    await session.execute(
        call_log_t.insert().values(
            id=session_id,
            clientId=decision.client_pk,
            subscriptionId=decision.subscription_id,
            callId=call_id,
            startedAt=now,
            endedAt=None,
            durationSeconds=reserved_seconds,
            status=IN_PROGRESS,
            createdAt=now,
        )
    )
    return SessionReservation(
        session_id=session_id,
        call_id=call_id,
        reserved_seconds=reserved_seconds,
        started_at=now,
    )


@dataclass(frozen=True)
class SessionFinalisation:
    session_id: str
    status: str
    duration_seconds: int
    already_final: bool


async def complete_session(
    session: AsyncSession,
    session_id: str,
    *,
    duration_seconds: int,
    final_status: str = "COMPLETED",
) -> SessionFinalisation | None:
    """Reconcile a reservation with the real call duration. Idempotent."""
    if final_status not in FINAL_STATUSES:
        final_status = "COMPLETED"
    duration_seconds = max(int(duration_seconds), 0)

    async with session.begin():
        row = (
            await session.execute(
                sa.select(
                    call_log_t.c.id,
                    call_log_t.c.status,
                    call_log_t.c.durationSeconds,
                )
                .where(call_log_t.c.id == session_id)
                .with_for_update()
            )
        ).first()
        if row is None:
            return None

        if row.status != IN_PROGRESS:
            return SessionFinalisation(
                session_id=session_id,
                status=str(row.status),
                duration_seconds=int(row.durationSeconds or 0),
                already_final=True,
            )

        await session.execute(
            call_log_t.update()
            .where(call_log_t.c.id == session_id)
            .values(
                durationSeconds=duration_seconds,
                endedAt=utcnow(),
                status=final_status,
            )
        )
        return SessionFinalisation(
            session_id=session_id,
            status=final_status,
            duration_seconds=duration_seconds,
            already_final=False,
        )


async def release_session(session: AsyncSession, session_id: str) -> bool:
    """Free an abandoned reservation (no minutes consumed)."""
    async with session.begin():
        result = await session.execute(
            call_log_t.update()
            .where(
                call_log_t.c.id == session_id,
                call_log_t.c.status == IN_PROGRESS,
            )
            .values(durationSeconds=0, endedAt=utcnow(), status="FAILED")
        )
        return result.rowcount > 0
