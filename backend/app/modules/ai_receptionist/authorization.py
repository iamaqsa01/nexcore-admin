"""The reusable AI Receptionist authorization decision.

Framework-free and storage-free: it depends only on a small repository
protocol, so it is exercised directly in unit tests with in-memory fakes and
wired to SQLAlchemy in ``routes.py``.

Flow (Phase 6 spec):

    client id -> client exists? -> AI subscription? -> subscription ACTIVE?
              -> client ACTIVE? -> current usage -> quota -> ALLOW / BLOCK
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from ...clients.repository import ClientRecord
from ...errors import (
    client_not_found,
    client_suspended,
    quota_exceeded,
    subscription_inactive,
)
from ...subscriptions.repository import SubscriptionRecord

ACTIVE = "ACTIVE"


class AuthorizationRepository(Protocol):
    async def get_client(self, identifier: str) -> ClientRecord | None: ...

    async def get_ai_receptionist_subscription(
        self, client_pk: str
    ) -> SubscriptionRecord | None: ...

    async def get_usage_seconds(self, subscription: SubscriptionRecord) -> int: ...

    async def get_quota_minutes(self, subscription_id: str) -> int | None: ...


@dataclass(frozen=True)
class AuthorizationDecision:
    allowed: bool
    client_pk: str
    client_id: str
    subscription_id: str
    quota_minutes: int
    quota_seconds: int
    used_seconds: int
    remaining_seconds: int


async def authorize_ai_receptionist(
    client_id: str,
    repo: AuthorizationRepository,
) -> AuthorizationDecision:
    """Return an ALLOW decision, or raise ``AuthorizationError`` to BLOCK."""

    client = await repo.get_client(client_id)
    if client is None:
        raise client_not_found(client_id)

    subscription = await repo.get_ai_receptionist_subscription(client.id)
    if subscription is None:
        raise subscription_inactive(
            "Client has no AI Receptionist subscription",
            {"client_id": client.client_id},
        )

    if subscription.status != ACTIVE:
        raise subscription_inactive(
            f"AI Receptionist subscription is {subscription.status}",
            {"subscription_status": subscription.status},
        )

    # Kill switch: a SUSPENDED (or INACTIVE) client blocks every new session
    # immediately, regardless of remaining quota.
    if client.status != ACTIVE:
        raise client_suspended(client.status)

    quota_minutes = await repo.get_quota_minutes(subscription.id)
    if quota_minutes is None or quota_minutes <= 0:
        raise quota_exceeded(
            "No monthly talk-time minutes are assigned to this client",
            {"quota_minutes": quota_minutes or 0},
        )

    quota_seconds = quota_minutes * 60
    used_seconds = await repo.get_usage_seconds(subscription)

    if used_seconds >= quota_seconds:
        raise quota_exceeded(
            "Monthly talk-time quota reached for the current billing period",
            {"used_seconds": used_seconds, "quota_seconds": quota_seconds},
        )

    return AuthorizationDecision(
        allowed=True,
        client_pk=client.id,
        client_id=client.client_id,
        subscription_id=subscription.id,
        quota_minutes=quota_minutes,
        quota_seconds=quota_seconds,
        used_seconds=used_seconds,
        remaining_seconds=quota_seconds - used_seconds,
    )
