from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_dek
from app.database import get_db
from app.models import Account, Credential, Domain, Email, Identity, Note, Phone, Task
from app.schemas.identity import IdentityCreate, IdentityOut, IdentityUpdate
from app.services.cascade import delete_account_cascade, delete_node_and_edges

router = APIRouter(prefix="/api/identities", tags=["identities"], dependencies=[Depends(get_current_dek)])


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
    Suppression en cascade : tout ce qui appartient à l'identité part
    avec elle.
    """
    identity = db.get(Identity, identity_id)
    if identity is None:
        raise HTTPException(status_code=404, detail="Identité introuvable.")

    for account in db.query(Account).filter_by(identity_id=identity.id).all():
        delete_account_cascade(db, account)

    db.query(Email).filter_by(identity_id=identity.id).delete(synchronize_session=False)
    db.query(Phone).filter_by(identity_id=identity.id).delete(synchronize_session=False)
    db.query(Domain).filter_by(identity_id=identity.id).delete(synchronize_session=False)
    db.query(Note).filter_by(owner_type="identity", owner_id=identity.id).delete(synchronize_session=False)
    db.query(Credential).filter_by(owner_type="identity", owner_id=identity.id).delete(synchronize_session=False)
    db.query(Task).filter_by(related_type="identity", related_id=identity.id).delete(synchronize_session=False)
    delete_node_and_edges(db, "identity", identity.id)

    db.delete(identity)
    db.commit()