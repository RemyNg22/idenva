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
    c.post("/api/auth/setup", json={"master_password": "correct-horse-battery"})
    yield c
    app.dependency_overrides.clear()



def test_create_and_list_identity(client):
    r = client.post("/api/identities", json={"name": "Cyber", "description": "sécu"})
    assert r.status_code == 201
    assert r.json()["name"] == "Cyber"

    r = client.get("/api/identities")
    assert len(r.json()) == 1


def test_get_update_delete_identity(client):
    created = client.post("/api/identities", json={"name": "Cyber"}).json()
    identity_id = created["id"]

    r = client.get(f"/api/identities/{identity_id}")
    assert r.status_code == 200

    r = client.put(f"/api/identities/{identity_id}", json={"importance": 5})
    assert r.json()["importance"] == 5
    assert r.json()["name"] == "Cyber"

    r = client.delete(f"/api/identities/{identity_id}")
    assert r.status_code == 204
    assert client.get(f"/api/identities/{identity_id}").status_code == 404


def test_identities_blocked_when_vault_locked(client):
    client.post("/api/auth/lock")

    r = client.get("/api/identities")
    assert r.status_code == 401

    r = client.post("/api/identities", json={"name": "Cyber"})
    assert r.status_code == 401