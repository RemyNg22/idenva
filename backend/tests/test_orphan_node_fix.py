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


def test_delete_account_standalone_removes_orphan_node(client):
    """Reproduit exactement le bug rapporté : supprimer un compte seul
    (pas via l'identité) ne doit laisser aucun nœud fantôme sur le canvas."""
    identity = client.post("/api/identities", json={"name": "Cyber"}).json()
    account = client.post(
        "/api/accounts", json={"identity_id": identity["id"], "service_name": "GitHub"}
    ).json()

    identity_node = client.post(
        "/api/graph/nodes",
        json={"entity_type": "identity", "entity_id": identity["id"], "pos_x": 0, "pos_y": 0},
    ).json()
    account_node = client.post(
        "/api/graph/nodes",
        json={"entity_type": "account", "entity_id": account["id"], "pos_x": 100, "pos_y": 100},
    ).json()
    client.post(
        "/api/graph/edges",
        json={"source_node_id": identity_node["id"], "target_node_id": account_node["id"], "relation_type": "CONTAINS"},
    )

    # Suppression du compte SEUL, pas de l'identité
    r = client.delete(f"/api/accounts/{account['id']}")
    assert r.status_code == 204

    # Le nœud du compte ne doit plus apparaître dans le graphe
    graph = client.get("/api/graph").json()
    node_ids_remaining = {n["id"] for n in graph["nodes"]}
    assert account_node["id"] not in node_ids_remaining
    assert identity_node["id"] in node_ids_remaining  # l'identité, elle, doit rester

    # L'arête qui pointait vers ce compte doit aussi avoir disparu
    edge_ids_remaining = {e["id"] for e in graph["edges"]}
    assert len(graph["edges"]) == 0 or all(
        e["target_node_id"] != account_node["id"] for e in graph["edges"]
    )


def test_delete_account_standalone_removes_its_notes_and_tasks(client):
    identity = client.post("/api/identities", json={"name": "Cyber"}).json()
    account = client.post(
        "/api/accounts", json={"identity_id": identity["id"], "service_name": "GitHub"}
    ).json()

    client.post("/api/notes", json={"owner_type": "account", "owner_id": account["id"], "content": "note test"})
    client.post("/api/tasks", json={"title": "tâche test", "related_type": "account", "related_id": account["id"]})

    client.delete(f"/api/accounts/{account['id']}")

    assert client.get(f"/api/notes?owner_type=account&owner_id={account['id']}").json() == []
    assert client.get(f"/api/tasks?related_type=account&related_id={account['id']}").json() == []