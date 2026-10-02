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


def _build_sample_vault(client):
    identity = client.post("/api/identities", json={"name": "Cyber", "description": "test"}).json()
    account = client.post(
        "/api/accounts",
        json={"identity_id": identity["id"], "service_name": "GitHub", "password": "mon_secret_github", "has_2fa": True},
    ).json()
    client.post("/api/notes", json={"owner_type": "identity", "owner_id": identity["id"], "content": "note secrète"})
    client.post("/api/tasks", json={"title": "Activer 2FA", "related_type": "identity", "related_id": identity["id"]})

    id_node = client.post(
        "/api/graph/nodes", json={"entity_type": "identity", "entity_id": identity["id"], "pos_x": 10, "pos_y": 20}
    ).json()
    acc_node = client.post(
        "/api/graph/nodes", json={"entity_type": "account", "entity_id": account["id"], "pos_x": 100, "pos_y": 120}
    ).json()
    client.post(
        "/api/graph/edges",
        json={"source_node_id": id_node["id"], "target_node_id": acc_node["id"], "relation_type": "CONTAINS"},
    )
    return identity, account


def test_export_rejects_short_password(client):
    r = client.post("/api/vault/export", json={"export_password": "court"})
    assert r.status_code == 422


def test_export_produces_well_formed_file(client):
    _build_sample_vault(client)
    r = client.post("/api/vault/export", json={"export_password": "mot-de-passe-export-1"})
    assert r.status_code == 200
    body = r.json()
    assert body["format_version"] == 1
    assert "ciphertext" in body and "kdf_salt" in body and "nonce" in body


def test_export_ciphertext_is_not_plaintext(client):
    _build_sample_vault(client)
    r = client.post("/api/vault/export", json={"export_password": "mot-de-passe-export-1"}).json()
    assert "mon_secret_github" not in r["ciphertext"]
    assert "note secrète" not in r["ciphertext"]


def test_import_with_wrong_export_password_fails(client):
    _build_sample_vault(client)
    export_file = client.post("/api/vault/export", json={"export_password": "mot-de-passe-export-1"}).json()

    r = client.post(
        "/api/vault/import",
        json={"export_password": "mauvais-mot-de-passe", "export_data": export_file},
    )
    assert r.status_code == 401


def test_import_round_trip_restores_correct_secret(client):
    identity, account = _build_sample_vault(client)

    export_file = client.post("/api/vault/export", json={"export_password": "mot-de-passe-export-1"}).json()

    r = client.post(
        "/api/vault/import",
        json={"export_password": "mot-de-passe-export-1", "export_data": export_file},
    )
    assert r.status_code == 200
    summary = r.json()
    assert summary["identities_imported"] == 1
    assert summary["accounts_imported"] == 1
    assert summary["notes_imported"] == 1
    assert summary["tasks_imported"] == 1
    assert summary["nodes_imported"] == 2
    assert summary["edges_imported"] == 1

    all_identities = client.get("/api/identities").json()
    assert len(all_identities) == 2

    imported_identity = next(i for i in all_identities if i["id"] != identity["id"])
    assert imported_identity["name"] == "Cyber"

    imported_accounts = client.get(f"/api/accounts?identity_id={imported_identity['id']}").json()
    assert len(imported_accounts) == 1
    assert imported_accounts[0]["id"] != account["id"]

    revealed = client.post(f"/api/accounts/{imported_accounts[0]['id']}/reveal-password").json()
    assert revealed["value"] == "mon_secret_github"


def test_import_preserves_original_data_untouched(client):
    identity, account = _build_sample_vault(client)
    export_file = client.post("/api/vault/export", json={"export_password": "mot-de-passe-export-1"}).json()
    client.post("/api/vault/import", json={"export_password": "mot-de-passe-export-1", "export_data": export_file})

    original = client.get(f"/api/identities/{identity['id']}").json()
    assert original["name"] == "Cyber"

    original_account_revealed = client.post(f"/api/accounts/{account['id']}/reveal-password").json()
    assert original_account_revealed["value"] == "mon_secret_github"


def test_import_note_content_correctly_decrypted(client):
    identity, _ = _build_sample_vault(client)
    export_file = client.post("/api/vault/export", json={"export_password": "mot-de-passe-export-1"}).json()
    client.post("/api/vault/import", json={"export_password": "mot-de-passe-export-1", "export_data": export_file})

    all_identities = client.get("/api/identities").json()
    imported_identity = next(i for i in all_identities if i["id"] != identity["id"])
    notes = client.get(f"/api/notes?owner_type=identity&owner_id={imported_identity['id']}").json()
    assert len(notes) == 1
    assert notes[0]["content"] == "note secrète"


def test_export_import_blocked_when_vault_locked(client):
    client.post("/api/auth/lock")
    r = client.post("/api/vault/export", json={"export_password": "mot-de-passe-export-1"})
    assert r.status_code == 401


def test_create_backup_and_list_it(client):
    _build_sample_vault(client)
    r = client.post("/api/vault/backup", json={"export_password": "mot-de-passe-backup-1"})
    assert r.status_code == 200
    filename = r.json()["filename"]

    backups = client.get("/api/vault/backups").json()
    assert any(b["filename"] == filename for b in backups)


def test_download_backup_and_import_it(client):
    identity, account = _build_sample_vault(client)
    backup = client.post("/api/vault/backup", json={"export_password": "mot-de-passe-backup-1"}).json()

    downloaded = client.get(f"/api/vault/backups/{backup['filename']}").json()
    assert downloaded["format_version"] == 1

    r = client.post(
        "/api/vault/import",
        json={"export_password": "mot-de-passe-backup-1", "export_data": downloaded},
    )
    assert r.status_code == 200
    assert r.json()["accounts_imported"] == 1


def test_download_backup_rejects_path_traversal(client):
    r = client.get("/api/vault/backups/..%2F..%2F..%2Fetc%2Fpasswd")
    assert r.status_code == 404

    r2 = client.get("/api/vault/backups/not-a-real-backup.json")
    assert r2.status_code == 404