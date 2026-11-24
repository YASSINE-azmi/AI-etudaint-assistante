from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import AuthenticatedUser, get_current_user
from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="user-1",
        email="student@example.test",
        role="student",
    )
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_me_returns_authenticated_profile(client: TestClient) -> None:
    response = client.get("/api/v1/me")

    assert response.status_code == 200
    assert response.json() == {
        "id": "user-1",
        "email": "student@example.test",
        "role": "student",
        "academic_track": "TCS",
    }
