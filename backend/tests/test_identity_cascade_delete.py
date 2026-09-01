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
    c.post("/api/auth/setup", json={"master_password": "mon-petit-mot-de-passe"})
    yield c
    app.dependency_overrides.clear()


def test_suppression_identite_cascade(client):
    identity = client.post("/api/identities", json={"name": "Cyber"}).json()
    account = client.post(
        "/api/accounts",
        json={"identity_id": identity["id"], "service_name": "GitHub", "password": "secret"}).json()

    r = client.delete(f"/api/identities/{identity['id']}")
    assert r.status_code == 204
    assert client.get(f"/api/identities/{identity['id']}").status_code == 404
    assert client.get(f"/api/accounts/{account['id']}").status_code == 404

def test_suppression_identite_sans_toucher_autre(client):
    identity_a = client.post("/api/identities", json={"name": "Cyber"}).json()
    identity_b = client.post("/api/identities", json={"name": "Business"}).json()

    account_b = client.post(
        "/api/accounts", json={"identity_id": identity_b["id"], "service_name": "Stripe"}).json()

    client.delete(f"/api/identities/{identity_a['id']}")

    assert client.get(f"/api/identities/{identity_b['id']}").status_code == 200
    assert client.get(f"/api/accounts/{account_b['id']}").status_code == 200
