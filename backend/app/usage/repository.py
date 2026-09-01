from __future__ import annotations

from datetime import datetime, timedelta, timezone

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import call_log as call_log_t
from ..subscriptions.repository import SubscriptionRecord

IN_PROGRESS = "IN_PROGRESS"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _month_bounds(now: datetime) -> tuple[datetime, datetime]:
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def resolve_billing_window(
    subscription: SubscriptionRecord, now: datetime | None = None
) -> tuple[datetime, datetime]:
    """The subscription's current billing window.

    Uses the stored ``billingPeriodStart/End`` while it is still current;
    falls back to the current UTC calendar month once that period has fully
    elapsed (the billing-cycle roll job is a later phase). Mirrors the
    Next.js ``modules/ai-receptionist/usage.ts`` logic.
    """
    now = now or utcnow()
    start = subscription.billing_period_start
    end = subscription.billing_period_end
    if start is not None and end is not None and end >= now:
        return start, end
    return _month_bounds(now)


async def get_usage_seconds(
    session: AsyncSession,
    subscription_id: str,
    window_start: datetime,
    window_end: datetime,
    *,
    reservation_ttl_seconds: int,
    now: datetime | None = None,
) -> int:
    """SUM(CallLog.durationSeconds) for the subscription within the window.

    Counts finished calls AND live reservations (IN_PROGRESS rows carry an
    estimated duration). Stale IN_PROGRESS rows — older than the reservation
    TTL — are treated as abandoned and excluded, so a crashed session cannot
    hold quota forever.
    """
    now = now or utcnow()
    stale_before = now - timedelta(seconds=reservation_ttl_seconds)

    stmt = sa.select(
        sa.func.coalesce(sa.func.sum(call_log_t.c.durationSeconds), 0)
    ).where(
        call_log_t.c.subscriptionId == subscription_id,
        call_log_t.c.startedAt >= window_start,
        call_log_t.c.startedAt < window_end,
        sa.not_(
            sa.and_(
                call_log_t.c.status == IN_PROGRESS,
                call_log_t.c.startedAt < stale_before,
            )
        ),
    )
    return int((await session.execute(stmt)).scalar_one())
