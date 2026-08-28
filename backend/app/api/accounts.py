from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_dek
from app.database import get_db
from app.models import Account
from app.schemas.account import AccountCreate, AccountOut, AccountUpdate, RevealedSecret
from app.security.crypto import decrypt, encrypt

router = APIRouter(prefix="/api/accounts", tags=["accounts"], dependencies=[Depends(get_current_dek)])


def _to_out(account: Account) -> AccountOut:
    return AccountOut(
        id=account.id,
        identity_id=account.identity_id,
        service_name=account.service_name,
        url=account.url,
        username=account.username,
        email_id=account.email_id,
        has_2fa=account.has_2fa,
        has_password=account.password_ciphertext is not None,
        has_totp=account.totp_ciphertext is not None,
        account_type=account.account_type,
        importance=account.importance,
        created_at=account.created_at,
        updated_at=account.updated_at,
        last_password_change=account.last_password_change)


@router.get("", response_model=list[AccountOut])
def list_accounts(identity_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Account)
    if identity_id:
        query = query.filter_by(identity_id=identity_id)
    return [_to_out(a) for a in query.all()]


@router.post("", response_model=AccountOut, status_code=201)
def create_account(payload: AccountCreate, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"password", "totp_secret"})
    account = Account(**data)

    if payload.password:
        nonce, ciphertext = encrypt(payload.password.encode("utf-8"), dek)
        account.password_nonce, account.password_ciphertext = nonce, ciphertext
        account.last_password_change = datetime.now(timezone.utc)

    if payload.totp_secret:
        nonce, ciphertext = encrypt(payload.totp_secret.encode("utf-8"), dek)
        account.totp_nonce, account.totp_ciphertext = nonce, ciphertext

    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_out(account)


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: str, db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")
    return _to_out(account)


@router.put("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: str,
    payload: AccountUpdate,
    dek: bytes = Depends(get_current_dek),
    db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")

    data = payload.model_dump(exclude_unset=True, exclude={"password", "totp_secret"})
    for field, value in data.items():
        setattr(account, field, value)

    if payload.password is not None:
        nonce, ciphertext = encrypt(payload.password.encode("utf-8"), dek)
        account.password_nonce, account.password_ciphertext = nonce, ciphertext
        account.last_password_change = datetime.now(timezone.utc)

    if payload.totp_secret is not None:
        nonce, ciphertext = encrypt(payload.totp_secret.encode("utf-8"), dek)
        account.totp_nonce, account.totp_ciphertext = nonce, ciphertext

    db.commit()
    db.refresh(account)
    return _to_out(account)


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: str, db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")
    db.delete(account)
    db.commit()


@router.post("/{account_id}/reveal-password", response_model=RevealedSecret)
def reveal_password(account_id: str, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")
    if account.password_ciphertext is None:
        raise HTTPException(status_code=404, detail="Aucun mot de passe enregistré pour ce compte.")

    plaintext = decrypt(account.password_nonce, account.password_ciphertext, dek)
    return RevealedSecret(value=plaintext.decode("utf-8"))


@router.post("/{account_id}/reveal-totp", response_model=RevealedSecret)
def reveal_totp(account_id: str, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")
    if account.totp_ciphertext is None:
        raise HTTPException(status_code=404, detail="Aucun secret TOTP enregistré pour ce compte.")

    plaintext = decrypt(account.totp_nonce, account.totp_ciphertext, dek)
    return RevealedSecret(value=plaintext.decode("utf-8"))