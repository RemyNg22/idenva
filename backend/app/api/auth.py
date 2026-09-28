from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import VaultMeta
from app.security.crypto import DecryptionError, decrypt, encrypt, generate_dek
from app.security.kdf import derive_key, generate_salt
from app.security.vault_session import VaultLockedError, vault_session_store

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "idenva_session"
MIN_PASSWORD_LENGTH = 12


class MasterPasswordIn(BaseModel):
    master_password: str = Field(min_length=1)


class ChangeMasterPasswordIn(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH)


def get_current_dek(idenva_session: str | None = Cookie(default=None)) -> bytes:
    """Dépendance FastAPI à utiliser sur toute route qui touche à un
    secret. Lève 401 si le vault est verrouillé ou la session expirée
    """
    try:
        return vault_session_store.get_dek(idenva_session)
    except VaultLockedError:
        raise HTTPException(status_code=401, detail="Vault verrouillé.")


@router.get("/status")
def status(db: Session = Depends(get_db), idenva_session: str | None = Cookie(default=None)):
    vault_exists = db.query(VaultMeta).filter_by(id="main").first() is not None
    return {
        "vault_exists": vault_exists,
        "unlocked": vault_session_store.is_unlocked(idenva_session)}


@router.post("/setup")
def setup(payload: MasterPasswordIn, response: Response, db: Session = Depends(get_db)):
    if db.query(VaultMeta).filter_by(id="main").first() is not None:
        raise HTTPException(status_code=409, detail="Le vault existe déjà.")

    if len(payload.master_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"Le mot de passe maître doit faire au moins {MIN_PASSWORD_LENGTH} caractères.")

    salt = generate_salt()
    kek = derive_key(payload.master_password, salt)
    dek = generate_dek()
    dek_nonce, dek_ciphertext = encrypt(dek, kek)

    vault = VaultMeta(id="main", argon2_salt=salt, dek_ciphertext=dek_ciphertext, dek_nonce=dek_nonce)
    db.add(vault)
    db.commit()

    token = vault_session_store.create(dek)
    response.set_cookie(COOKIE_NAME, token, httponly=True, samesite="strict", path="/")
    return {"status": "vault_created"}


@router.post("/unlock")
def unlock(payload: MasterPasswordIn, response: Response, db: Session = Depends(get_db)):
    vault = db.query(VaultMeta).filter_by(id="main").first()
    if vault is None:
        raise HTTPException(status_code=404, detail="Aucun vault - crée-en un via /setup.")

    kek = derive_key(payload.master_password, vault.argon2_salt)
    try:
        dek = decrypt(vault.dek_nonce, vault.dek_ciphertext, kek)
    except DecryptionError:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect.")

    token = vault_session_store.create(dek)
    response.set_cookie(COOKIE_NAME, token, httponly=True, samesite="strict", path="/")
    return {"status": "unlocked"}


@router.post("/lock")
def lock(response: Response, idenva_session: str | None = Cookie(default=None)):
    vault_session_store.lock(idenva_session)
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"status": "locked"}


@router.post("/change-master-password")
def change_master_password(
    payload: ChangeMasterPasswordIn,
    db: Session = Depends(get_db),
    current_dek: bytes = Depends(get_current_dek),
):
    # Vérifier que le coffre fort existe
    vault = db.query(VaultMeta).filter_by(id="main").first()
    if vault is None:
        raise HTTPException(status_code=404, detail="Aucun vault existant.")

    # Vérifier l'ancien mot de passe maître
    current_kek = derive_key(payload.current_password, vault.argon2_salt)
    try:
        decrypted_dek = decrypt(vault.dek_nonce, vault.dek_ciphertext, current_kek)
        # S'assurer que la DEK déchiffrée correspond bien à la DEK en mémoire
        if decrypted_dek != current_dek:
            raise DecryptionError()
    except DecryptionError:
        raise HTTPException(status_code=401, detail="Mot de passe maître actuel incorrect.")

    # Générer un nouveau sel, dériver la nouvelle KEK et rechiffrer la même DEK
    new_salt = generate_salt()
    new_kek = derive_key(payload.new_password, new_salt)
    new_dek_nonce, new_dek_ciphertext = encrypt(current_dek, new_kek)

    # Mettre à jour VaultMeta en base de données
    vault.argon2_salt = new_salt
    vault.dek_nonce = new_dek_nonce
    vault.dek_ciphertext = new_dek_ciphertext
    db.commit()

    return {"status": "password_changed"}