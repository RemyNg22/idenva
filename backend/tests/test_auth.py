import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.security.vault_session import VAULT_SESSION_TIMEOUT, vault_session_store


@pytest.fixture
def client(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    vault_session_store._sessions.clear()
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_status_when_no_vault_exists(client):
    r = client.get("/api/auth/status")
    assert r.json() == {"vault_exists": False, "unlocked": False}


def test_setup_creates_vault_and_unlocks(client):
    r = client.post("/api/auth/setup", json={"master_password": "mon-bonmdp-baguette"})
    assert r.status_code == 200
    assert "idenva_session" in r.cookies

    status = client.get("/api/auth/status").json()
    assert status == {"vault_exists": True, "unlocked": True}


def test_setup_rejects_short_password(client):
    r = client.post("/api/auth/setup", json={"master_password": "petit"})
    assert r.status_code == 422


def test_setup_twice_fails(client):
    client.post("/api/auth/setup", json={"master_password": "mon-bonmdp-baguette"})
    r = client.post("/api/auth/setup", json={"master_password": "autre-motdepasse-croissant"})
    assert r.status_code == 409


def test_unlock_with_correct_password(client):
    client.post("/api/auth/setup", json={"master_password": "mon-bonmdp-baguette"})
    client.post("/api/auth/lock")

    r = client.post("/api/auth/unlock", json={"master_password": "mon-bonmdp-baguette"})
    assert r.status_code == 200
    assert client.get("/api/auth/status").json()["unlocked"] is True


def test_unlock_with_wrong_password_fails(client):
    client.post("/api/auth/setup", json={"master_password": "mon-bonmdp-baguette"})
    client.post("/api/auth/lock")

    r = client.post("/api/auth/unlock", json={"master_password": "autre-motdepasse-croissant"})
    assert r.status_code == 401
    assert client.get("/api/auth/status").json()["unlocked"] is False


def test_unlock_without_existing_vault_fails(client):
    r = client.post("/api/auth/unlock", json={"master_password": "autre-motdepasse"})
    assert r.status_code == 404


def test_lock_clears_session(client):
    client.post("/api/auth/setup", json={"master_password": "mon-bonmdp-baguette"})
    assert client.get("/api/auth/status").json()["unlocked"] is True

    client.post("/api/auth/lock")
    assert client.get("/api/auth/status").json()["unlocked"] is False


def test_session_expires_after_timeout(client):
    from datetime import datetime, timedelta, timezone

    client.post("/api/auth/setup", json={"master_password": "mon-bonmdp-baguette"})

    token = list(vault_session_store._sessions.keys())[0]
    session = vault_session_store._sessions[token]
    session.last_activity = datetime.now(timezone.utc) - VAULT_SESSION_TIMEOUT - timedelta(seconds=1)

    assert client.get("/api/auth/status").json()["unlocked"] is False


def test_status_without_cookie_is_never_unlocked(client):
    client.post("/api/auth/setup", json={"master_password": "mon-bonmdp-baguette"})

    fresh_client = TestClient(app)
    assert fresh_client.get("/api/auth/status").json()["unlocked"] is False