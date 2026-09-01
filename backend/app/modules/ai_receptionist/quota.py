from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from ...config import MONTHLY_TALK_TIME_MINUTES_KEY
from ...models import subscription_entitlement as entitlement_t


async def get_quota_minutes(
    session: AsyncSession,
    subscription_id: str,
    *,
    key: str = MONTHLY_TALK_TIME_MINUTES_KEY,
) -> int | None:
    """Assigned monthly talk-time limit in whole minutes.

    ``None`` means no limit has been assigned (the client is enrolled but the
    admin has not set minutes) — the authorization flow treats that as a hard
    block, not "unlimited".
    """
    row = (
        await session.execute(
            sa.select(entitlement_t.c.intValue)
            .where(
                entitlement_t.c.subscriptionId == subscription_id,
                entitlement_t.c.key == key,
            )
            .limit(1)
        )
    ).first()
    if row is None or row.intValue is None:
        return None
    return int(row.intValue)


def minutes_to_seconds(minutes: int) -> int:
    return minutes * 60


def compute_reservation_seconds(estimated_seconds: int, remaining_seconds: int) -> int:
    """How much to reserve for a session that is being authorized.

    Never negative, never more than what is left, always at least 1 so an
    active session always consumes something against a concurrent check.
    """
    bounded = min(max(estimated_seconds, 1), max(remaining_seconds, 1))
    return bounded
