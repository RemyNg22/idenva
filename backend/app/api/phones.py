from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_dek
from app.database import get_db
from app.models import Phone
from app.schemas.phone import PhoneCreate, PhoneOut, PhoneUpdate
from app.security.crypto import decrypt, encrypt

router = APIRouter(prefix="/api/phones", tags=["phones"], dependencies=[Depends(get_current_dek)])


def _to_out(phone: Phone, dek: bytes) -> PhoneOut:
    plaintext = decrypt(phone.number_nonce, phone.number_ciphertext, dek)
    return PhoneOut(id=phone.id, identity_id=phone.identity_id, number=plaintext.decode("utf-8"), created_at=phone.created_at)


@router.get("", response_model=list[PhoneOut])
def list_phones(identity_id: str | None = None, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    query = db.query(Phone)
    if identity_id:
        query = query.filter_by(identity_id=identity_id)
    return [_to_out(p, dek) for p in query.all()]


@router.post("", response_model=PhoneOut, status_code=201)
def create_phone(payload: PhoneCreate, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    nonce, ciphertext = encrypt(payload.number.encode("utf-8"), dek)
    phone = Phone(identity_id=payload.identity_id, number_nonce=nonce, number_ciphertext=ciphertext)
    db.add(phone)
    db.commit()
    db.refresh(phone)
    return _to_out(phone, dek)


@router.put("/{phone_id}", response_model=PhoneOut)
def update_phone(phone_id: str, payload: PhoneUpdate, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    phone = db.get(Phone, phone_id)
    if phone is None:
        raise HTTPException(status_code=404, detail="Téléphone introuvable.")
    nonce, ciphertext = encrypt(payload.number.encode("utf-8"), dek)
    phone.number_nonce, phone.number_ciphertext = nonce, ciphertext
    db.commit()
    db.refresh(phone)
    return _to_out(phone, dek)


@router.delete("/{phone_id}", status_code=204)
def delete_phone(phone_id: str, db: Session = Depends(get_db)):
    phone = db.get(Phone, phone_id)
    if phone is None:
        raise HTTPException(status_code=404, detail="Téléphone introuvable.")
    db.delete(phone)
    db.commit()