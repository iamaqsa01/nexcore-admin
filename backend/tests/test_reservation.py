from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.modules.ai_receptionist.quota import compute_reservation_seconds
from app.subscriptions.repository import SubscriptionRecord
from app.usage.repository import resolve_billing_window


@pytest.mark.parametrize(
    "estimate,remaining,expected",
    [
        (300, 6000, 300),   # normal: reserve the estimate
        (10_000, 600, 600),  # clamp to what's left
        (0, 600, 1),         # never reserve zero for a live session
        (300, 0, 1),         # at the limit, still reserve the minimum
        (-5, 600, 1),        # defensive against negative input
    ],
)
def test_compute_reservation_seconds(estimate, remaining, expected):
    assert compute_reservation_seconds(estimate, remaining) == expected


def _sub(start, end):
    return SubscriptionRecord(
        id="s", client_id="c", status="ACTIVE",
        billing_period_start=start, billing_period_end=end,
    )


def test_billing_window_uses_stored_period_when_current():
    now = datetime.now(timezone.utc)
    start, end = now - timedelta(days=2), now + timedelta(days=20)
    got_start, got_end = resolve_billing_window(_sub(start, end), now)
    assert (got_start, got_end) == (start, end)


def test_billing_window_falls_back_to_calendar_month_when_elapsed():
    now = datetime(2026, 3, 15, 12, 0, tzinfo=timezone.utc)
    elapsed_end = datetime(2026, 2, 1, tzinfo=timezone.utc)
    start, end = resolve_billing_window(_sub(elapsed_end - timedelta(days=31), elapsed_end), now)
    assert start == datetime(2026, 3, 1, tzinfo=timezone.utc)
    assert end == datetime(2026, 4, 1, tzinfo=timezone.utc)


def test_billing_window_month_rollover_december():
    now = datetime(2026, 12, 10, tzinfo=timezone.utc)
    start, end = resolve_billing_window(_sub(None, None), now)
    assert start == datetime(2026, 12, 1, tzinfo=timezone.utc)
    assert end == datetime(2027, 1, 1, tzinfo=timezone.utc)
