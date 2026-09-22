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
    c.test_session_factory = TestingSessionLocal  # exposé pour les tests qui lisent la DB directement
    yield c
    app.dependency_overrides.clear()


@pytest.fixture
def identity_id(client):
    return client.post("/api/identities", json={"name": "Cyber"}).json()["id"]


# --- Notes ---

def test_create_note_returns_decrypted_content(client, identity_id):
    r = client.post(
        "/api/notes",
        json={"owner_type": "identity", "owner_id": identity_id, "content": "Ne pas utiliser mon email perso."},
    )
    assert r.status_code == 201
    assert r.json()["content"] == "Ne pas utiliser mon email perso."


def test_note_content_is_encrypted_in_db_not_plaintext(client, identity_id):
    client.post("/api/notes", json={"owner_type": "identity", "owner_id": identity_id, "content": "secret_unique_xyz"})
    db = client.test_session_factory()
    from app.models import Note
    note = db.query(Note).first()
    assert b"secret_unique_xyz" not in note.content_ciphertext
    db.close()


def test_list_notes_filtered_by_owner(client, identity_id):
    other_identity = client.post("/api/identities", json={"name": "Business"}).json()["id"]
    client.post("/api/notes", json={"owner_type": "identity", "owner_id": identity_id, "content": "note A"})
    client.post("/api/notes", json={"owner_type": "identity", "owner_id": other_identity, "content": "note B"})

    r = client.get(f"/api/notes?owner_type=identity&owner_id={identity_id}")
    assert len(r.json()) == 1
    assert r.json()[0]["content"] == "note A"


def test_update_note(client, identity_id):
    note = client.post(
        "/api/notes", json={"owner_type": "identity", "owner_id": identity_id, "content": "ancien"}
    ).json()

    r = client.put(f"/api/notes/{note['id']}", json={"content": "nouveau"})
    assert r.json()["content"] == "nouveau"


def test_delete_note(client, identity_id):
    note = client.post(
        "/api/notes", json={"owner_type": "identity", "owner_id": identity_id, "content": "temp"}
    ).json()

    r = client.delete(f"/api/notes/{note['id']}")
    assert r.status_code == 204
    assert client.get(f"/api/notes?owner_type=identity&owner_id={identity_id}").json() == []


def test_notes_blocked_when_vault_locked(client, identity_id):
    client.post("/api/auth/lock")
    r = client.post("/api/notes", json={"owner_type": "identity", "owner_id": identity_id, "content": "x"})
    assert r.status_code == 401


# --- Tasks ---

def test_create_and_list_task(client, identity_id):
    r = client.post(
        "/api/tasks", json={"title": "Activer 2FA", "related_type": "identity", "related_id": identity_id}
    )
    assert r.status_code == 201
    assert r.json()["status"] == "todo"

    r = client.get(f"/api/tasks?related_type=identity&related_id={identity_id}")
    assert len(r.json()) == 1


def test_update_task_status(client, identity_id):
    task = client.post(
        "/api/tasks", json={"title": "Activer 2FA", "related_type": "identity", "related_id": identity_id}
    ).json()

    r = client.put(f"/api/tasks/{task['id']}", json={"status": "done"})
    assert r.json()["status"] == "done"


def test_delete_task(client, identity_id):
    task = client.post(
        "/api/tasks", json={"title": "temp", "related_type": "identity", "related_id": identity_id}
    ).json()

    r = client.delete(f"/api/tasks/{task['id']}")
    assert r.status_code == 204


def test_tasks_blocked_when_vault_locked(client):
    client.post("/api/auth/lock")
    r = client.get("/api/tasks")
    assert r.status_code == 401