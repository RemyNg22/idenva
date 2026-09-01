from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_dek
from app.database import get_db
from app.models import Account, Credential, Domain, Edge, Email, Identity, Node, Note, Phone, Task
from app.schemas.identity import IdentityCreate, IdentityOut, IdentityUpdate

router = APIRouter(prefix="/api/identities", tags=["identities"], dependencies=[Depends(get_current_dek)])


def _delete_node_and_edges(db: Session, entity_type: str, entity_id: str) -> None:
    node = db.query(Node).filter_by(entity_type=entity_type, entity_id=entity_id).first()
    if node is None:
        return
    db.query(Edge).filter((Edge.source_node_id == node.id)|(Edge.target_node_id == node.id)).delete(synchronize_session=False)
    db.delete(node)


def _delete_account_cascade(db: Session, account: Account) -> None:
    db.query(Note).filter_by(owner_type="account", owner_id=account.id).delete(synchronize_session=False)
    db.query(Credential).filter_by(owner_type="account", owner_id=account.id).delete(synchronize_session=False)
    db.query(Task).filter_by(related_type="account", related_id=account.id).delete(synchronize_session=False)
    _delete_node_and_edges(db, "account", account.id)
    db.delete(account)


@router.get("", response_model=list[IdentityOut])
def list_identities(db: Session = Depends(get_db)):
    return db.query(Identity).all()

@router.post("", response_model=IdentityOut, status_code=201)
def create_identity(payload: IdentityCreate, db: Session = Depends(get_db)):
    identity = Identity(**payload.model_dump())
    db.add(identity)
    db.commit()
    db.refresh(identity)
    return identity

@router.get("/{identity_id}", response_model=IdentityOut)
def get_identity(identity_id: str, db: Session = Depends(get_db)):
    identity = db.get(Identity, identity_id)
    if identity is None:
        raise HTTPException(status_code=404, detail="Identité introuvable.")
    return identity


@router.put("/{identity_id}", response_model=IdentityOut)
def update_identity(identity_id: str, payload: IdentityUpdate, db: Session = Depends(get_db)):
    identity = db.get(Identity, identity_id)
    if identity is None:
        raise HTTPException(status_code=404, detail="Identité introuvable.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(identity, field, value)

    db.commit()
    db.refresh(identity)
    return identity


@router.delete("/{identity_id}", status_code=204)
def delete_identity(identity_id: str, db: Session = Depends(get_db)):
    """
    Tout ce qui appartient à l'identité partavec elle (comptes et leurs secrets/notes/tâches/nœud de canvas,
    emails, téléphones, domaines, notes et tâches propres à l'identité, son propre noeud et les arêtes).
    """
    identity = db.get(Identity, identity_id)
    if identity is None:
        raise HTTPException(status_code=404, detail="Identité introuvable.")

    for account in db.query(Account).filter_by(identity_id=identity.id).all():
        _delete_account_cascade(db, account)

    db.query(Email).filter_by(identity_id=identity.id).delete(synchronize_session=False)
    db.query(Phone).filter_by(identity_id=identity.id).delete(synchronize_session=False)
    db.query(Domain).filter_by(identity_id=identity.id).delete(synchronize_session=False)
    db.query(Note).filter_by(owner_type="identity", owner_id=identity.id).delete(synchronize_session=False)
    db.query(Credential).filter_by(owner_type="identity", owner_id=identity.id).delete(synchronize_session=False)
    db.query(Task).filter_by(related_type="identity", related_id=identity.id).delete(synchronize_session=False)
    _delete_node_and_edges(db, "identity", identity.id)

    db.delete(identity)
    db.commit()