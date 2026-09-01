"""HTTP layer: verify status codes and that the response `detail` carries the
stable machine code (CLIENT_NOT_FOUND / QUOTA_EXCEEDED / ...)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.auth import require_service_token
from app.main import app
from app.modules.ai_receptionist.routes import get_authorization_repo
from tests.fakes import FakeRepo, make_client

AUTHORIZE_URL = "/v1/ai-receptionist/authorize"


@pytest.fixture
def make_client_for():
    created: list[TestClient] = []

    def _factory(repo: FakeRepo) -> TestClient:
        app.dependency_overrides[require_service_token] = lambda: None
        app.dependency_overrides[get_authorization_repo] = lambda: repo
        tc = TestClient(app)
        created.append(tc)
        return tc

    yield _factory
    app.dependency_overrides.clear()


def test_authorize_allows(make_client_for):
    tc = make_client_for(FakeRepo(quota_minutes=100, used_seconds=60))
    res = tc.post(AUTHORIZE_URL, json={"client_id": "NC-CL-000001"})
    assert res.status_code == 200
    body = res.json()
    assert body["allowed"] is True
    assert body["quota_seconds"] == 6000
    assert body["remaining_seconds"] == 5940


def test_authorize_unknown_client_returns_404(make_client_for):
    tc = make_client_for(FakeRepo(client=None))
    res = tc.post(AUTHORIZE_URL, json={"client_id": "ghost"})
    assert res.status_code == 404
    assert res.json()["detail"] == "CLIENT_NOT_FOUND"


def test_authorize_suspended_client_returns_403(make_client_for):
    tc = make_client_for(
        FakeRepo(client=make_client(status="SUSPENDED"), quota_minutes=100)
    )
    res = tc.post(AUTHORIZE_URL, json={"client_id": "NC-CL-000001"})
    assert res.status_code == 403
    assert res.json()["detail"] == "CLIENT_SUSPENDED"


def test_authorize_quota_exceeded_returns_403(make_client_for):
    tc = make_client_for(FakeRepo(quota_minutes=10, used_seconds=600))
    res = tc.post(AUTHORIZE_URL, json={"client_id": "NC-CL-000001"})
    assert res.status_code == 403
    assert res.json()["detail"] == "QUOTA_EXCEEDED"


def test_authorize_rejects_empty_body(make_client_for):
    tc = make_client_for(FakeRepo())
    res = tc.post(AUTHORIZE_URL, json={})
    assert res.status_code == 422  # pydantic validation
