"""Concurrency: simultaneous session starts must not bypass the quota.

Production does this with ``SELECT ... FOR UPDATE`` on the Subscription row
(``lock_ai_receptionist_subscription``) wrapping the check-then-reserve. These
tests model that serialization in memory and prove it is the lock that stops
the race — the naive version over-allocates.
"""

from __future__ import annotations

import asyncio

import pytest


class LockingSubscription:
    """One subscription's quota, guarded like a FOR UPDATE row lock."""

    def __init__(self, quota_seconds: int) -> None:
        self.quota_seconds = quota_seconds
        self.committed = 0
        self.reserved = 0
        self._lock = asyncio.Lock()

    async def try_start(self, estimated_seconds: int) -> bool:
        async with self._lock:  # serialises check-then-reserve
            used = self.committed + self.reserved
            await asyncio.sleep(0)  # force a scheduler switch inside the section
            if used >= self.quota_seconds:
                return False
            self.reserved += max(1, min(estimated_seconds, self.quota_seconds - used))
            return True


class NaiveSubscription:
    """Same, but with no lock — the classic check-then-act race."""

    def __init__(self, quota_seconds: int) -> None:
        self.quota_seconds = quota_seconds
        self.committed = 0
        self.reserved = 0

    async def try_start(self, estimated_seconds: int) -> bool:
        used = self.committed + self.reserved
        await asyncio.sleep(0)  # every coroutine reads before anyone writes
        if used >= self.quota_seconds:
            return False
        self.reserved += max(1, min(estimated_seconds, self.quota_seconds - used))
        return True


async def test_locking_prevents_quota_bypass():
    sub = LockingSubscription(quota_seconds=600)  # 10 minutes
    results = await asyncio.gather(*(sub.try_start(300) for _ in range(10)))
    assert sum(results) == 2  # only two 5-minute sessions fit
    assert sub.reserved <= sub.quota_seconds


async def test_naive_check_then_act_would_bypass():
    sub = NaiveSubscription(quota_seconds=600)
    results = await asyncio.gather(*(sub.try_start(300) for _ in range(10)))
    assert sum(results) == 10  # the race the row lock exists to prevent
    assert sub.reserved > sub.quota_seconds


@pytest.mark.parametrize("quota_seconds,estimate,expected", [(600, 300, 2), (600, 60, 10), (0, 60, 0)])
async def test_locking_capacity_scales_with_estimate(quota_seconds, estimate, expected):
    sub = LockingSubscription(quota_seconds=quota_seconds)
    results = await asyncio.gather(*(sub.try_start(estimate) for _ in range(20)))
    assert sum(results) == expected
