from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_dek
from app.database import get_db
from app.models import Credential
from app.schemas.credential import CredentialCreate, CredentialOut, CredentialUpdate, RevealedCredential
from app.security.crypto import decrypt, encrypt

router = APIRouter(prefix="/api/credentials", tags=["credentials"], dependencies=[Depends(get_current_dek)])


@router.get("", response_model=list[CredentialOut])
def list_credentials(owner_type: str | None = None, owner_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Credential)
    if owner_type:
        query = query.filter_by(owner_type=owner_type)
    if owner_id:
        query = query.filter_by(owner_id=owner_id)
    return query.all()


@router.post("", response_model=CredentialOut, status_code=201)
def create_credential(payload: CredentialCreate, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    nonce, ciphertext = encrypt(payload.secret.encode("utf-8"), dek)
    credential = Credential(
        owner_type=payload.owner_type, owner_id=payload.owner_id, label=payload.label,
        secret_type=payload.secret_type, secret_nonce=nonce, secret_ciphertext=ciphertext,
    )
    db.add(credential)
    db.commit()
    db.refresh(credential)
    return credential


@router.put("/{credential_id}", response_model=CredentialOut)
def update_credential(credential_id: str, payload: CredentialUpdate, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    credential = db.get(Credential, credential_id)
    if credential is None:
        raise HTTPException(status_code=404, detail="Credential introuvable.")

    if payload.label is not None:
        credential.label = payload.label
    if payload.secret_type is not None:
        credential.secret_type = payload.secret_type
    if payload.secret is not None:
        nonce, ciphertext = encrypt(payload.secret.encode("utf-8"), dek)
        credential.secret_nonce, credential.secret_ciphertext = nonce, ciphertext

    db.commit()
    db.refresh(credential)
    return credential


@router.delete("/{credential_id}", status_code=204)
def delete_credential(credential_id: str, db: Session = Depends(get_db)):
    credential = db.get(Credential, credential_id)
    if credential is None:
        raise HTTPException(status_code=404, detail="Credential introuvable.")
    db.delete(credential)
    db.commit()


@router.post("/{credential_id}/reveal", response_model=RevealedCredential)
def reveal_credential(credential_id: str, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    credential = db.get(Credential, credential_id)
    if credential is None:
        raise HTTPException(status_code=404, detail="Credential introuvable.")
    plaintext = decrypt(credential.secret_nonce, credential.secret_ciphertext, dek)
    return RevealedCredential(value=plaintext.decode("utf-8"))