import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.security.vault_session import vault_session_store


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
    c = TestClient(app)
    c.post("/api/auth/setup", json={"master_password": "mot-de-passe-remy-complique"})
    yield c
    app.dependency_overrides.clear()


def test_generate_password_default_length(client):
    r = client.get("/api/utils/generate-password")
    assert r.status_code == 200
    assert len(r.json()["password"]) == 24


def test_generate_password_custom_length(client):
    r = client.get("/api/utils/generate-password?length=40")
    assert len(r.json()["password"]) == 40


def test_generate_password_two_calls_differ(client):
    p1 = client.get("/api/utils/generate-password").json()["password"]
    p2 = client.get("/api/utils/generate-password").json()["password"]
    assert p1 != p2


def test_generate_password_rejects_no_charset(client):
    r = client.get(
        "/api/utils/generate-password?uppercase=false&lowercase=false&numbers=false&symbols=false"
    )
    assert r.status_code == 422


def test_generate_password_digits_only(client):
    r = client.get(
        "/api/utils/generate-password?uppercase=false&lowercase=false&numbers=true&symbols=false&length=30"
    )
    password = r.json()["password"]
    assert password.isdigit()


def test_generate_password_blocked_when_vault_locked(client):
    client.post("/api/auth/lock")
    r = client.get("/api/utils/generate-password")
    assert r.status_code == 401