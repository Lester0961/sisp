import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.security import settings


client = TestClient(app)
TEST_SECRET = "phase10-test-secret"
PROTECTED_POSTS = [
    ("/chat", {"query": "What is the enrollment procedure?"}),
    ("/classify", {"query": "What is the enrollment procedure?"}),
    ("/retrieve", {"query": "What is the enrollment procedure?"}),
]


@pytest.mark.parametrize(("path", "payload"), PROTECTED_POSTS)
def test_ml_service_routes_reject_missing_and_invalid_secrets(monkeypatch, path, payload):
    monkeypatch.setattr(settings, "ml_secret_token", TEST_SECRET)

    assert client.post(path, json=payload).status_code == 401
    assert client.post(
        path,
        json=payload,
        headers={"X-ML-Secret": "invalid-test-secret"},
    ).status_code == 401


def test_valid_secret_allows_classifier_route(monkeypatch):
    monkeypatch.setattr(settings, "ml_secret_token", TEST_SECRET)

    response = client.post(
        "/classify",
        json={"query": "What is the enrollment procedure?"},
        headers={"X-ML-Secret": TEST_SECRET},
    )

    assert response.status_code == 200
    assert response.json()["intent"] == "enrollment_inquiry"
