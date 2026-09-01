"""Phase 6 required matrix, exercised directly against the reusable flow.

    Unknown Client        -> BLOCK
    Suspended Client      -> BLOCK
    Inactive Subscription -> BLOCK
    Quota Exceeded        -> BLOCK
    Quota Available       -> ALLOW
"""

from __future__ import annotations

import pytest

from app.errors import AuthorizationError
from app.modules.ai_receptionist.authorization import authorize_ai_receptionist
from tests.fakes import FakeRepo, make_client, make_subscription


async def test_unknown_client_blocks():
    repo = FakeRepo(client=None)
    with pytest.raises(AuthorizationError) as exc:
        await authorize_ai_receptionist("does-not-exist", repo)
    assert exc.value.code == "CLIENT_NOT_FOUND"
    assert exc.value.status_code == 404


async def test_missing_subscription_blocks():
    repo = FakeRepo(subscription=None, quota_minutes=100)
    with pytest.raises(AuthorizationError) as exc:
        await authorize_ai_receptionist("NC-CL-000001", repo)
    assert exc.value.code == "SUBSCRIPTION_INACTIVE"
    assert exc.value.status_code == 403


@pytest.mark.parametrize("sub_status", ["PAUSED", "CANCELLED", "SUSPENDED"])
async def test_inactive_subscription_blocks(sub_status):
    repo = FakeRepo(
        subscription=make_subscription(status=sub_status),
        quota_minutes=100,
        used_seconds=0,
    )
    with pytest.raises(AuthorizationError) as exc:
        await authorize_ai_receptionist("NC-CL-000001", repo)
    assert exc.value.code == "SUBSCRIPTION_INACTIVE"
    assert exc.value.context["subscription_status"] == sub_status


@pytest.mark.parametrize("client_status", ["SUSPENDED", "INACTIVE"])
async def test_suspended_client_blocks_kill_switch(client_status):
    repo = FakeRepo(
        client=make_client(status=client_status),
        quota_minutes=100_000,  # plenty of quota — kill switch still wins
        used_seconds=0,
    )
    with pytest.raises(AuthorizationError) as exc:
        await authorize_ai_receptionist("NC-CL-000001", repo)
    assert exc.value.code == "CLIENT_SUSPENDED"
    assert exc.value.status_code == 403
    assert exc.value.context["client_status"] == client_status


async def test_quota_exceeded_blocks_at_exact_limit():
    # 100 minutes == 6000 seconds; used == limit -> blocked (>=).
    repo = FakeRepo(quota_minutes=100, used_seconds=6000)
    with pytest.raises(AuthorizationError) as exc:
        await authorize_ai_receptionist("NC-CL-000001", repo)
    assert exc.value.code == "QUOTA_EXCEEDED"
    assert exc.value.status_code == 403
    assert exc.value.context == {"used_seconds": 6000, "quota_seconds": 6000}


async def test_unassigned_quota_blocks():
    repo = FakeRepo(quota_minutes=None, used_seconds=0)
    with pytest.raises(AuthorizationError) as exc:
        await authorize_ai_receptionist("NC-CL-000001", repo)
    assert exc.value.code == "QUOTA_EXCEEDED"


async def test_quota_available_allows():
    repo = FakeRepo(quota_minutes=100, used_seconds=1800)  # 30 of 100 min used
    decision = await authorize_ai_receptionist("NC-CL-000001", repo)
    assert decision.allowed is True
    assert decision.quota_seconds == 6000
    assert decision.used_seconds == 1800
    assert decision.remaining_seconds == 4200


async def test_flow_short_circuits_in_spec_order():
    # Unknown client must not even look at subscription / usage / quota.
    repo = FakeRepo(client=None)
    with pytest.raises(AuthorizationError):
        await authorize_ai_receptionist("x", repo)
    assert [name for name, _ in repo.calls] == ["get_client"]
