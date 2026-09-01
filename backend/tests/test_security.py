"""Server-to-server auth: the shared-secret token is mandatory."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.modules.ai_receptionist.routes import get_authorization_repo
from tests.fakes import FakeRepo

AUTHORIZE_URL = "/v1/ai-receptionist/authorize"


@pytest.fixture
def configured_secret(monkeypatch):
    monkeypatch.setenv("ADMIN_SERVICE_SECRET", "test-shared-secret")
    get_settings.cache_clear()
    yield "test-shared-secret"
    get_settings.cache_clear()


def test_missing_token_is_rejected(configured_secret):
    with TestClient(app) as tc:
        res = tc.post(AUTHORIZE_URL, json={"client_id": "NC-CL-000001"})
    assert res.status_code == 401
    assert res.json()["detail"] == "INVALID_SERVICE_TOKEN"


def test_wrong_token_is_rejected(configured_secret):
    with TestClient(app) as tc:
        res = tc.post(
            AUTHORIZE_URL,
            headers={"X-Service-Token": "not-the-secret"},
            json={"client_id": "NC-CL-000001"},
        )
    assert res.status_code == 401


def test_correct_token_passes_auth_layer(configured_secret):
    app.dependency_overrides[get_authorization_repo] = lambda: FakeRepo(
        quota_minutes=100, used_seconds=0
    )
    try:
        with TestClient(app) as tc:
            res = tc.post(
                AUTHORIZE_URL,
                headers={"X-Service-Token": configured_secret},
                json={"client_id": "NC-CL-000001"},
            )
    finally:
        app.dependency_overrides.clear()
    assert res.status_code == 200
    assert res.json()["allowed"] is True
