from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import AI_RECEPTIONIST_PRODUCT_KEY
from ..models import product as product_t
from ..models import subscription as subscription_t

ACTIVE_SUBSCRIPTION_STATUS = "ACTIVE"


@dataclass(frozen=True)
class SubscriptionRecord:
    id: str
    client_id: str
    status: str
    billing_period_start: datetime | None
    billing_period_end: datetime | None

    @property
    def is_active(self) -> bool:
        return self.status == ACTIVE_SUBSCRIPTION_STATUS


def _select_ai_subscription(client_pk: str, product_key: str):
    join = subscription_t.join(
        product_t, subscription_t.c.productId == product_t.c.id
    )
    return (
        sa.select(
            subscription_t.c.id,
            subscription_t.c.clientId,
            subscription_t.c.status,
            subscription_t.c.billingPeriodStart,
            subscription_t.c.billingPeriodEnd,
        )
        .select_from(join)
        .where(
            sa.and_(
                subscription_t.c.clientId == client_pk,
                product_t.c.key == product_key,
            )
        )
        .order_by(subscription_t.c.createdAt.desc())
        .limit(1)
    )


def _to_record(row) -> SubscriptionRecord:
    return SubscriptionRecord(
        id=row.id,
        client_id=row.clientId,
        status=str(row.status),
        billing_period_start=row.billingPeriodStart,
        billing_period_end=row.billingPeriodEnd,
    )


async def get_ai_receptionist_subscription(
    session: AsyncSession,
    client_pk: str,
    *,
    product_key: str = AI_RECEPTIONIST_PRODUCT_KEY,
) -> SubscriptionRecord | None:
    row = (await session.execute(_select_ai_subscription(client_pk, product_key))).first()
    return _to_record(row) if row is not None else None


async def lock_ai_receptionist_subscription(
    session: AsyncSession,
    client_pk: str,
    *,
    product_key: str = AI_RECEPTIONIST_PRODUCT_KEY,
) -> SubscriptionRecord | None:
    """Same lookup, but ``SELECT ... FOR UPDATE`` on the Subscription row.

    Concurrency control: acquiring this row lock serialises all quota checks
    for the same subscription, so two simultaneous session starts cannot both
    read "under quota" and both reserve. Must be called inside a transaction.
    """
    stmt = _select_ai_subscription(client_pk, product_key).with_for_update(
        of=subscription_t
    )
    row = (await session.execute(stmt)).first()
    return _to_record(row) if row is not None else None
