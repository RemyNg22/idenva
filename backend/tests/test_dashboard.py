from datetime import datetime, timedelta, timezone

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
    c.test_session_factory = TestingSessionLocal
    yield c
    app.dependency_overrides.clear()


def test_dashboard_empty_vault(client):
    r = client.get("/api/dashboard/security")
    assert r.status_code == 200
    body = r.json()
    assert body["overview"]["identities_count"] == 0
    assert body["overview"]["accounts_count"] == 0
    assert body["alerts"] == []
    assert body["correlations"] == []


def test_weak_password_detected(client):
    identity = client.post("/api/identities", json={"name": "Cyber"}).json()
    client.post(
        "/api/accounts",
        json={"identity_id": identity["id"], "service_name": "Faible", "password": "azerty"},
    )

    r = client.get("/api/dashboard/security").json()
    assert r["overview"]["weak_passwords_count"] == 1
    assert any(a["message"] == "Mot de passe faible" for a in r["alerts"])


def test_strong_password_not_flagged_weak(client):
    identity = client.post("/api/identities", json={"name": "Cyber"}).json()
    client.post(
        "/api/accounts",
        json={"identity_id": identity["id"], "service_name": "Fort", "password": "xQ8!vP2@kL9#unique"},
    )

    r = client.get("/api/dashboard/security").json()
    assert r["overview"]["weak_passwords_count"] == 0


def test_reused_password_detected(client):
    identity = client.post("/api/identities", json={"name": "Cyber"}).json()
    client.post(
        "/api/accounts",
        json={"identity_id": identity["id"], "service_name": "A", "password": "MemeMotDePasseUnique123"},
    )
    client.post(
        "/api/accounts",
        json={"identity_id": identity["id"], "service_name": "B", "password": "MemeMotDePasseUnique123"},
    )

    r = client.get("/api/dashboard/security").json()
    assert r["overview"]["reused_passwords_count"] == 2
    assert sum(1 for a in r["alerts"] if "réutilisé" in a["message"]) == 2


def test_different_passwords_not_flagged_reused(client):
    identity = client.post("/api/identities", json={"name": "Cyber"}).json()
    client.post("/api/accounts", json={"identity_id": identity["id"], "service_name": "A", "password": "UniquePasswordAAA1"})
    client.post("/api/accounts", json={"identity_id": identity["id"], "service_name": "B", "password": "UniquePasswordBBB2"})

    r = client.get("/api/dashboard/security").json()
    assert r["overview"]["reused_passwords_count"] == 0


def test_old_password_detected(client):
    identity = client.post("/api/identities", json={"name": "Cyber"}).json()
    account = client.post(
        "/api/accounts",
        json={"identity_id": identity["id"], "service_name": "Ancien", "password": "UnMotDePasseUnique1"},
    ).json()
    db = client.test_session_factory()
    from app.models import Account as AccountModel
    db_account = db.get(AccountModel, account["id"])
    db_account.last_password_change = datetime.now(timezone.utc) - timedelta(days=400)
    db.commit()
    db.close()

    r = client.get("/api/dashboard/security").json()
    assert r["overview"]["old_passwords_count"] == 1


def test_no_2fa_generates_warning_alert(client):
    identity = client.post("/api/identities", json={"name": "Cyber"}).json()
    client.post("/api/accounts", json={"identity_id": identity["id"], "service_name": "NoTFA"})

    r = client.get("/api/dashboard/security").json()
    assert any(a["message"] == "2FA désactivée" and a["severity"] == "warning" for a in r["alerts"])


def test_2fa_enabled_not_flagged(client):
    identity = client.post("/api/identities", json={"name": "Cyber"}).json()
    client.post("/api/accounts", json={"identity_id": identity["id"], "service_name": "WithTFA", "has_2fa": True})

    r = client.get("/api/dashboard/security").json()
    assert r["overview"]["two_fa_enabled_count"] == 1
    assert not any(a["message"] == "2FA désactivée" for a in r["alerts"])


def test_correlation_detected_via_shared_domain(client):
    identity_a = client.post("/api/identities", json={"name": "Public"}).json()
    identity_b = client.post("/api/identities", json={"name": "Business"}).json()

    db = client.test_session_factory()
    from app.models import Domain
    db.add(Domain(identity_id=identity_a["id"], domain_name="exemple.com"))
    db.add(Domain(identity_id=identity_b["id"], domain_name="EXEMPLE.com"))  # casse différente
    db.commit()
    db.close()

    r = client.get("/api/dashboard/security").json()
    assert len(r["correlations"]) == 1
    assert r["correlations"][0]["shared_fields"] == ["domain"]


def test_no_correlation_when_no_shared_data(client):
    client.post("/api/identities", json={"name": "Public"})
    client.post("/api/identities", json={"name": "Business"})

    r = client.get("/api/dashboard/security").json()
    assert r["correlations"] == []


def test_opsec_score_perfect_for_clean_identity(client):
    identity = client.post("/api/identities", json={"name": "Clean"}).json()
    client.post(
        "/api/accounts",
        json={"identity_id": identity["id"], "service_name": "Good", "password": "xQ8!vP2@kL9#uniqueABC", "has_2fa": True},
    )

    r = client.get("/api/dashboard/security").json()
    score = next(s for s in r["scores"] if s["identity_id"] == identity["id"])
    assert score["score"] == 100
    assert score["factors"] == []


def test_opsec_score_drops_with_issues(client):
    identity = client.post("/api/identities", json={"name": "Messy"}).json()
    client.post(
        "/api/accounts",
        json={"identity_id": identity["id"], "service_name": "Bad", "password": "azerty"},  # faible, pas de 2FA
    )

    r = client.get("/api/dashboard/security").json()
    score = next(s for s in r["scores"] if s["identity_id"] == identity["id"])
    assert score["score"] < 100
    assert len(score["factors"]) >= 2  # au moins: faible + pas de 2FA


def test_dashboard_blocked_when_vault_locked(client):
    client.post("/api/auth/lock")
    r = client.get("/api/dashboard/security")
    assert r.status_code == 401