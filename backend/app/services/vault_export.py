import base64
import json
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import Account, Edge, Identity, Node, Note, Task
from app.security.crypto import DecryptionError, decrypt, encrypt
from app.security.kdf import derive_key, generate_salt

EXPORT_FORMAT_VERSION = 1

"""Tables volontairement exclues de l'export : Email, Phone, Domain, Credential, Tag. 
Ces modèles existent en base mais n'ont jamais eu de routes API ni d'interface construites"""


def _decrypt_or_none(nonce: bytes | None, ciphertext: bytes | None, dek: bytes) -> str | None:
    if ciphertext is None:
        return None
    return decrypt(nonce, ciphertext, dek).decode("utf-8")


def build_export_payload(db: Session, dek: bytes) -> dict:
    """Construit la structure de données en clair à exporter. Ne touche
    jamais le disque et est toujours chiffrée avant écriture par encrypt_export()"""
    identities = db.query(Identity).all()
    accounts = db.query(Account).all()
    notes = db.query(Note).all()
    tasks = db.query(Task).all()
    nodes = db.query(Node).all()
    edges = db.query(Edge).all()

    return {
        "identities": [
            {
                "id": i.id, "name": i.name, "description": i.description,
                "icon": i.icon, "color": i.color, "tags": i.tags, "importance": i.importance,
            }
            for i in identities
        ],
        "accounts": [
            {
                "id": a.id, "identity_id": a.identity_id, "service_name": a.service_name,
                "url": a.url, "username": a.username,
                "password": _decrypt_or_none(a.password_nonce, a.password_ciphertext, dek),
                "totp_secret": _decrypt_or_none(a.totp_nonce, a.totp_ciphertext, dek),
                "has_2fa": a.has_2fa, "account_type": a.account_type, "importance": a.importance,
                "last_password_change": a.last_password_change.isoformat() if a.last_password_change else None,
            }
            for a in accounts
        ],
        "notes": [
            {
                "id": n.id, "owner_type": n.owner_type, "owner_id": n.owner_id,
                "content": _decrypt_or_none(n.content_nonce, n.content_ciphertext, dek),
            }
            for n in notes
        ],
        "tasks": [
            {
                "id": t.id, "title": t.title, "description": t.description, "status": t.status,
                "priority": t.priority, "due_date": t.due_date.isoformat() if t.due_date else None,
                "related_type": t.related_type, "related_id": t.related_id,
            }
            for t in tasks
        ],
        "nodes": [
            {
                "id": n.id, "entity_type": n.entity_type, "entity_id": n.entity_id,
                "pos_x": n.pos_x, "pos_y": n.pos_y, "width": n.width, "height": n.height,
                "visual_state": n.visual_state,
            }
            for n in nodes
        ],
        "edges": [
            {
                "id": e.id, "source_node_id": e.source_node_id, "target_node_id": e.target_node_id,
                "relation_type": e.relation_type, "label": e.label,
            }
            for e in edges
        ],
    }


def encrypt_export(payload: dict, export_password: str) -> dict:
    """Chiffre le payload avec une clé dérivée du mot de passe d'export"""
    salt = generate_salt()
    key = derive_key(export_password, salt)
    plaintext = json.dumps(payload).encode("utf-8")
    nonce, ciphertext = encrypt(plaintext, key)

    return {
        "format_version": EXPORT_FORMAT_VERSION,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "kdf_salt": base64.b64encode(salt).decode("ascii"),
        "nonce": base64.b64encode(nonce).decode("ascii"),
        "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
    }


def decrypt_export(export_file: dict, export_password: str) -> dict:
    if export_file.get("format_version") != EXPORT_FORMAT_VERSION:
        raise ValueError("Format d'export non reconnu ou fichier corrompu.")

    salt = base64.b64decode(export_file["kdf_salt"])
    nonce = base64.b64decode(export_file["nonce"])
    ciphertext = base64.b64decode(export_file["ciphertext"])

    key = derive_key(export_password, salt)
    plaintext = decrypt(nonce, ciphertext, key)
    return json.loads(plaintext.decode("utf-8"))


def import_payload(db: Session, dek: bytes, payload: dict) -> dict:
    """
    Recrée toutes les lignes avec de NOUVEAUX identifiants, jamais les
    ID d'origine, pour ne jamais entrer en collision avec des données
    déjà présentes dans le coffre fort cible
    """
    identity_map: dict[str, str] = {}
    for item in payload.get("identities", []):
        new_id = str(uuid.uuid4())
        identity_map[item["id"]] = new_id
        db.add(Identity(
            id=new_id, name=item["name"], description=item.get("description"),
            icon=item.get("icon"), color=item.get("color"), tags=item.get("tags"),
            importance=item.get("importance", 0),
        ))
    db.flush()

    account_map: dict[str, str] = {}
    for item in payload.get("accounts", []):
        if item["identity_id"] not in identity_map:
            continue
        new_id = str(uuid.uuid4())
        account_map[item["id"]] = new_id
        account = Account(
            id=new_id, identity_id=identity_map[item["identity_id"]],
            service_name=item["service_name"], url=item.get("url"), username=item.get("username"),
            has_2fa=item.get("has_2fa", False), account_type=item.get("account_type"),
            importance=item.get("importance", 0),
        )
        if item.get("password"):
            nonce, ciphertext = encrypt(item["password"].encode("utf-8"), dek)
            account.password_nonce, account.password_ciphertext = nonce, ciphertext
        if item.get("totp_secret"):
            nonce, ciphertext = encrypt(item["totp_secret"].encode("utf-8"), dek)
            account.totp_nonce, account.totp_ciphertext = nonce, ciphertext
        if item.get("last_password_change"):
            account.last_password_change = datetime.fromisoformat(item["last_password_change"])
        db.add(account)
    db.flush()

    def _remap_owner(owner_type: str | None, owner_id: str | None) -> str | None:
        if owner_id is None:
            return None
        owner_map = identity_map if owner_type == "identity" else account_map
        return owner_map.get(owner_id)

    notes_imported = 0
    for item in payload.get("notes", []):
        new_owner_id = _remap_owner(item.get("owner_type"), item.get("owner_id"))
        if new_owner_id is None or item.get("content") is None:
            continue
        nonce, ciphertext = encrypt(item["content"].encode("utf-8"), dek)
        db.add(Note(
            id=str(uuid.uuid4()), owner_type=item["owner_type"], owner_id=new_owner_id,
            content_nonce=nonce, content_ciphertext=ciphertext,
        ))
        notes_imported += 1

    tasks_imported = 0
    for item in payload.get("tasks", []):
        related_id = _remap_owner(item.get("related_type"), item.get("related_id"))
        db.add(Task(
            id=str(uuid.uuid4()), title=item["title"], description=item.get("description"),
            status=item.get("status", "todo"), priority=item.get("priority", "normal"),
            due_date=datetime.fromisoformat(item["due_date"]) if item.get("due_date") else None,
            related_type=item.get("related_type"), related_id=related_id,
        ))
        tasks_imported += 1

    node_map: dict[str, str] = {}
    for item in payload.get("nodes", []):
        entity_map = identity_map if item["entity_type"] == "identity" else account_map
        if item["entity_id"] not in entity_map:
            continue
        new_node_id = str(uuid.uuid4())
        node_map[item["id"]] = new_node_id
        db.add(Node(
            id=new_node_id, entity_type=item["entity_type"], entity_id=entity_map[item["entity_id"]],
            pos_x=item.get("pos_x", 0.0), pos_y=item.get("pos_y", 0.0),
            width=item.get("width"), height=item.get("height"), visual_state=item.get("visual_state"),
        ))
    db.flush()

    edges_imported = 0
    for item in payload.get("edges", []):
        if item["source_node_id"] in node_map and item["target_node_id"] in node_map:
            db.add(Edge(
                id=str(uuid.uuid4()), source_node_id=node_map[item["source_node_id"]],
                target_node_id=node_map[item["target_node_id"]],
                relation_type=item["relation_type"], label=item.get("label"),
            ))
            edges_imported += 1

    db.commit()

    return {
        "identities_imported": len(identity_map),
        "accounts_imported": len(account_map),
        "notes_imported": notes_imported,
        "tasks_imported": tasks_imported,
        "nodes_imported": len(node_map),
        "edges_imported": edges_imported,
    }