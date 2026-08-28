from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_dek
from app.database import get_db
from app.models import Identity
from app.schemas.identity import IdentityCreate, IdentityOut, IdentityUpdate

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
    identity = db.get(Identity, identity_id)
    if identity is None:
        raise HTTPException(status_code=404, detail="Identité introuvable.")

    db.delete(identity)
    db.commit()