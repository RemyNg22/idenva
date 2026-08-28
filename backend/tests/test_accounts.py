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
    c.post("/api/auth/setup", json={"master_password": "jaime-strasbourg-et-vous"})
    yield c
    app.dependency_overrides.clear()


@pytest.fixture
def identity_id(client):
    return client.post("/api/identities", json={"name": "Cyber"}).json()["id"]


def test_create_account_never_returns_plaintext_password(client, identity_id):
    r = client.post(
        "/api/accounts",
        json={"identity_id": identity_id, "service_name": "GitHub", "password": "mon_super_secret"},
    )
    assert r.status_code == 201
    body = r.json()
    assert "password" not in body
    assert "password_ciphertext" not in body
    assert body["has_password"] is True


def test_reveal_password_requires_explicit_call(client, identity_id):
    created = client.post(
        "/api/accounts",
        json={"identity_id": identity_id, "service_name": "GitHub", "password": "mon_super_secret"},
    ).json()

    r = client.post(f"/api/accounts/{created['id']}/reveal-password")
    assert r.status_code == 200
    assert r.json()["value"] == "mon_super_secret"


def test_reveal_password_without_password_set_fails(client, identity_id):
    created = client.post(
        "/api/accounts", json={"identity_id": identity_id, "service_name": "GitHub"}
    ).json()

    r = client.post(f"/api/accounts/{created['id']}/reveal-password")
    assert r.status_code == 404


def test_update_account_password_changes_last_password_change(client, identity_id):
    created = client.post(
        "/api/accounts",
        json={"identity_id": identity_id, "service_name": "GitHub", "password": "ancien_mdp"},
    ).json()
    old_date = created["last_password_change"]

    updated = client.put(
        f"/api/accounts/{created['id']}", json={"password": "nouveau_mdp"}
    ).json()
    assert updated["last_password_change"] != old_date

    revealed = client.post(f"/api/accounts/{created['id']}/reveal-password").json()
    assert revealed["value"] == "nouveau_mdp"


def test_accounts_blocked_when_vault_locked(client, identity_id):
    created = client.post(
        "/api/accounts",
        json={"identity_id": identity_id, "service_name": "GitHub", "password": "secret"},
    ).json()

    client.post("/api/auth/lock")

    assert client.get("/api/accounts").status_code == 401
    assert client.post(f"/api/accounts/{created['id']}/reveal-password").status_code == 401


def test_list_accounts_filtered_by_identity(client, identity_id):
    other_identity = client.post("/api/identities", json={"name": "Business"}).json()["id"]

    client.post("/api/accounts", json={"identity_id": identity_id, "service_name": "GitHub"})
    client.post("/api/accounts", json={"identity_id": other_identity, "service_name": "Stripe"})

    r = client.get(f"/api/accounts?identity_id={identity_id}")
    assert len(r.json()) == 1
    assert r.json()[0]["service_name"] == "GitHub"