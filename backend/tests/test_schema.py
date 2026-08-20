from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Account, Edge, Identity, Node, Note, Tag, Task
from app.security.crypto import decrypt, encrypt, generate_dek


def make_session(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_all_tables_are_created(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)

    expected_tables = {
        "identities", "accounts", "emails", "phones", "domains",
        "credentials", "notes", "tasks", "nodes", "edges", "tags",
    }
    assert expected_tables.issubset(set(Base.metadata.tables.keys()))


def test_account_password_roundtrip_through_db(tmp_path):
    """Test d' un mot de passe chiffré, stocké en
    base, relu, et déchiffré pour voir le cycle complet"""
    db = make_session(tmp_path)
    dek = generate_dek()

    identity = Identity(name="Cyber")
    db.add(identity)
    db.commit()

    nonce, ciphertext = encrypt(b"mon_mot_de_passe_github", dek)
    account = Account(
        identity_id=identity.id,
        service_name="GitHub",
        username="RemyNg22",
        password_ciphertext=ciphertext,
        password_nonce=nonce,
        has_2fa=True,
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    fetched = db.query(Account).filter_by(service_name="GitHub").first()
    recovered = decrypt(fetched.password_nonce, fetched.password_ciphertext, dek)

    assert recovered == b"mon_mot_de_passe_github"
    assert fetched.has_2fa is True


def test_task_linked_to_identity(tmp_path):
    db = make_session(tmp_path)
    identity = Identity(name="Cyber")
    db.add(identity)
    db.commit()

    task = Task(title="Activer 2FA GitHub", related_type="identity", related_id=identity.id)
    db.add(task)
    db.commit()

    fetched = db.query(Task).filter_by(title="Activer 2FA GitHub").first()
    assert fetched.related_id == identity.id
    assert fetched.status == "todo"


def test_node_and_edge_persist_graph_position(tmp_path):
    db = make_session(tmp_path)
    identity = Identity(name="Cyber")
    db.add(identity)
    db.commit()

    node1 = Node(entity_type="identity", entity_id=identity.id, pos_x=100.0, pos_y=200.0)
    node2 = Node(entity_type="identity", entity_id=identity.id, pos_x=300.0, pos_y=200.0)
    db.add_all([node1, node2])
    db.commit()

    edge = Edge(source_node_id=node1.id, target_node_id=node2.id, relation_type="RELATED_TO")
    db.add(edge)
    db.commit()

    fetched_edge = db.query(Edge).first()
    assert fetched_edge.relation_type == "RELATED_TO"
    assert fetched_edge.source_node_id == node1.id


def test_note_content_is_never_stored_in_plaintext(tmp_path):
    db = make_session(tmp_path)
    dek = generate_dek()
    plaintext = b"Ne pas utiliser mon email personnel."
    nonce, ciphertext = encrypt(plaintext, dek)

    note = Note(owner_type="identity", owner_id="fake-id", content_ciphertext=ciphertext, content_nonce=nonce)
    db.add(note)
    db.commit()

    fetched = db.query(Note).first()
    assert plaintext not in fetched.content_ciphertext
    assert decrypt(fetched.content_nonce, fetched.content_ciphertext, dek) == plaintext


def test_tag_name_is_unique(tmp_path):
    import pytest
    from sqlalchemy.exc import IntegrityError

    db = make_session(tmp_path)
    db.add(Tag(name="perso"))
    db.commit()

    db.add(Tag(name="perso"))
    with pytest.raises(IntegrityError):
        db.commit()