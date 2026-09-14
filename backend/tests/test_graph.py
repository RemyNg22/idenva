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


@pytest.fixture
def identity_id(client):
    return client.post("/api/identities", json={"name": "Cyber"}).json()["id"]


def test_get_graph_empty_by_default(client):
    r = client.get("/api/graph")
    assert r.json() == {"nodes": [], "edges": []}


def test_create_node(client, identity_id):
    r = client.post(
        "/api/graph/nodes",
        json={"entity_type": "identity", "entity_id": identity_id, "pos_x": 100, "pos_y": 200},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["pos_x"] == 100
    assert body["pos_y"] == 200

    graph = client.get("/api/graph").json()
    assert len(graph["nodes"]) == 1


def test_update_node_position(client, identity_id):
    node = client.post(
        "/api/graph/nodes", json={"entity_type": "identity", "entity_id": identity_id}
    ).json()

    r = client.patch(f"/api/graph/nodes/{node['id']}", json={"pos_x": 500, "pos_y": 300})
    assert r.status_code == 200
    assert r.json()["pos_x"] == 500
    assert r.json()["pos_y"] == 300


def test_update_position_of_missing_node_404(client):
    r = client.patch("/api/graph/nodes/does-not-exist", json={"pos_x": 0, "pos_y": 0})
    assert r.status_code == 404


def test_create_edge_between_two_nodes(client, identity_id):
    node1 = client.post("/api/graph/nodes", json={"entity_type": "identity", "entity_id": identity_id}).json()
    node2 = client.post("/api/graph/nodes", json={"entity_type": "identity", "entity_id": identity_id}).json()

    r = client.post(
        "/api/graph/edges",
        json={"source_node_id": node1["id"], "target_node_id": node2["id"], "relation_type": "RELATED_TO"},
    )
    assert r.status_code == 201

    graph = client.get("/api/graph").json()
    assert len(graph["edges"]) == 1


def test_create_edge_with_missing_node_fails(client):
    r = client.post(
        "/api/graph/edges",
        json={"source_node_id": "fake-1", "target_node_id": "fake-2", "relation_type": "RELATED_TO"},
    )
    assert r.status_code == 404


def test_delete_edge(client, identity_id):
    node1 = client.post("/api/graph/nodes", json={"entity_type": "identity", "entity_id": identity_id}).json()
    node2 = client.post("/api/graph/nodes", json={"entity_type": "identity", "entity_id": identity_id}).json()
    edge = client.post(
        "/api/graph/edges",
        json={"source_node_id": node1["id"], "target_node_id": node2["id"], "relation_type": "RELATED_TO"},
    ).json()

    r = client.delete(f"/api/graph/edges/{edge['id']}")
    assert r.status_code == 204
    assert client.get("/api/graph").json()["edges"] == []


def test_delete_node_also_deletes_its_edges(client, identity_id):
    node1 = client.post("/api/graph/nodes", json={"entity_type": "identity", "entity_id": identity_id}).json()
    node2 = client.post("/api/graph/nodes", json={"entity_type": "identity", "entity_id": identity_id}).json()
    client.post(
        "/api/graph/edges",
        json={"source_node_id": node1["id"], "target_node_id": node2["id"], "relation_type": "RELATED_TO"},
    )

    client.delete(f"/api/graph/nodes/{node1['id']}")

    graph = client.get("/api/graph").json()
    assert len(graph["nodes"]) == 1
    assert graph["edges"] == []


def test_graph_blocked_when_vault_locked(client):
    client.post("/api/auth/lock")
    assert client.get("/api/graph").status_code == 401