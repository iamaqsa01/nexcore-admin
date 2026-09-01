from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.clients.repository import ClientRecord
from app.subscriptions.repository import SubscriptionRecord

_SENTINEL = object()


def make_client(
    *,
    status: str = "ACTIVE",
    pk: str = "clnt_1",
    human_id: str = "NC-CL-000001",
    name: str = "Bright Smile Dental",
) -> ClientRecord:
    return ClientRecord(id=pk, client_id=human_id, name=name, status=status)


def make_subscription(
    *,
    status: str = "ACTIVE",
    sub_id: str = "sub_1",
    client_pk: str = "clnt_1",
) -> SubscriptionRecord:
    now = datetime.now(timezone.utc)
    return SubscriptionRecord(
        id=sub_id,
        client_id=client_pk,
        status=status,
        billing_period_start=now - timedelta(days=1),
        billing_period_end=now + timedelta(days=29),
    )


class FakeRepo:
    """In-memory implementation of the AuthorizationRepository protocol."""

    def __init__(
        self,
        *,
        client=_SENTINEL,
        subscription=_SENTINEL,
        used_seconds: int = 0,
        quota_minutes: int | None = None,
    ) -> None:
        self._client = make_client() if client is _SENTINEL else client
        self._subscription = (
            make_subscription() if subscription is _SENTINEL else subscription
        )
        self._used = used_seconds
        self._quota = quota_minutes
        self.calls: list[tuple[str, object]] = []

    async def get_client(self, identifier: str):
        self.calls.append(("get_client", identifier))
        if self._client is None:
            return None
        if identifier in (self._client.id, self._client.client_id):
            return self._client
        return None

    async def get_ai_receptionist_subscription(self, client_pk: str):
        self.calls.append(("get_ai_receptionist_subscription", client_pk))
        return self._subscription

    async def get_usage_seconds(self, subscription):
        self.calls.append(("get_usage_seconds", subscription.id))
        return self._used

    async def get_quota_minutes(self, subscription_id: str):
        self.calls.append(("get_quota_minutes", subscription_id))
        return self._quota
