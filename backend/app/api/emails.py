from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_dek
from app.database import get_db
from app.models import Email
from app.schemas.email import EmailCreate, EmailOut, EmailUpdate
from app.security.crypto import decrypt, encrypt

router = APIRouter(prefix="/api/emails", tags=["emails"], dependencies=[Depends(get_current_dek)])


def _to_out(email: Email, dek: bytes) -> EmailOut:
    if email.is_sensitive:
        address = decrypt(email.address_nonce, email.address_ciphertext, dek).decode("utf-8")
    else:
        address = email.address or ""
    return EmailOut(id=email.id, identity_id=email.identity_id, address=address, is_sensitive=email.is_sensitive, created_at=email.created_at)


def _apply_address(email: Email, address: str, is_sensitive: bool, dek: bytes) -> None:
    """Bascule proprement entre les deux représentations (clair / chiffré)
    selon is_sensitive"""
    if is_sensitive:
        nonce, ciphertext = encrypt(address.encode("utf-8"), dek)
        email.address_nonce, email.address_ciphertext = nonce, ciphertext
        email.address = None
    else:
        email.address = address
        email.address_nonce, email.address_ciphertext = None, None
    email.is_sensitive = is_sensitive


@router.get("", response_model=list[EmailOut])
def list_emails(identity_id: str | None = None, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    query = db.query(Email)
    if identity_id:
        query = query.filter_by(identity_id=identity_id)
    return [_to_out(e, dek) for e in query.all()]


@router.post("", response_model=EmailOut, status_code=201)
def create_email(payload: EmailCreate, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    email = Email(identity_id=payload.identity_id)
    _apply_address(email, payload.address, payload.is_sensitive, dek)
    db.add(email)
    db.commit()
    db.refresh(email)
    return _to_out(email, dek)


@router.put("/{email_id}", response_model=EmailOut)
def update_email(email_id: str, payload: EmailUpdate, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    email = db.get(Email, email_id)
    if email is None:
        raise HTTPException(status_code=404, detail="Email introuvable.")

    new_is_sensitive = payload.is_sensitive if payload.is_sensitive is not None else email.is_sensitive
    if payload.address is not None or payload.is_sensitive is not None:
        current_address = payload.address if payload.address is not None else _to_out(email, dek).address
        _apply_address(email, current_address, new_is_sensitive, dek)

    db.commit()
    db.refresh(email)
    return _to_out(email, dek)


@router.delete("/{email_id}", status_code=204)
def delete_email(email_id: str, db: Session = Depends(get_db)):
    email = db.get(Email, email_id)
    if email is None:
        raise HTTPException(status_code=404, detail="Email introuvable.")
    db.delete(email)
    db.commit()