import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.api.auth import COOKIE_NAME, get_current_dek
from app.config import settings
from app.database import get_db
from app.models import Account, Credential, Domain, Edge, Email, Identity, Node, Note, Phone, Tag, Task, VaultMeta
from app.schemas.export import BackupInfo, ExportFile, ExportPasswordIn, ImportIn, ImportSummary, ResetVaultIn
from app.security.crypto import DecryptionError, decrypt
from app.security.kdf import derive_key
from app.security.vault_session import vault_session_store
from app.services.vault_export import build_export_payload, decrypt_export, encrypt_export, import_payload

router = APIRouter(prefix="/api/vault", tags=["vault"], dependencies=[Depends(get_current_dek)])

BACKUP_DIR = settings.data_dir / "backups"
BACKUP_FILENAME_PATTERN = re.compile(r"^idenva-backup-\d{8}-\d{6}\.json$")


@router.post("/export", response_model=ExportFile)
def export_vault(payload: ExportPasswordIn, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    data = build_export_payload(db, dek)
    return encrypt_export(data, payload.export_password)


@router.post("/import", response_model=ImportSummary)
def import_vault(payload: ImportIn, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    try:
        data = decrypt_export(payload.export_data.model_dump(), payload.export_password)
    except DecryptionError:
        raise HTTPException(status_code=401, detail="Mot de passe d'export incorrect.")
    except (ValueError, KeyError):
        raise HTTPException(status_code=422, detail="Fichier d'export invalide ou corrompu.")

    return import_payload(db, dek, data)


@router.post("/backup", response_model=BackupInfo)
def create_backup(payload: ExportPasswordIn, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    data = build_export_payload(db, dek)
    export_file = encrypt_export(data, payload.export_password)

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"idenva-backup-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.json"
    path = BACKUP_DIR / filename
    path.write_text(json.dumps(export_file))

    return BackupInfo(filename=filename, created_at=export_file["exported_at"], size_bytes=path.stat().st_size)


@router.get("/backups", response_model=list[BackupInfo])
def list_backups():
    if not BACKUP_DIR.exists():
        return []

    results = []
    for path in sorted(BACKUP_DIR.glob("idenva-backup-*.json"), reverse=True):
        results.append(BackupInfo(
            filename=path.name,
            created_at=datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat(),
            size_bytes=path.stat().st_size,
        ))
    return results


@router.post("/reset")
def reset_vault(
    payload: ResetVaultIn,
    response: Response,
    dek: bytes = Depends(get_current_dek),
    db: Session = Depends(get_db),
    idenva_session: str | None = Cookie(default=None),
):
    """
    Remise à zéro complète, supprime toutes les données et le coffre-fort
    lui-même (identique à l'état du tout premier lancement, écran
    "Create Master Password" inclus).
    Double vérification avant toute suppression :
    1. get_current_dek : le vault doit déjà être déverrouillé.
    2. Le mot de passe maître doit être re-saisi ici et redéchiffrer
    correctement la vraie DEK du vault - une session active seule ne suffit pas à déclencher cette action.

    Les fichiers de backup sur disque ne sont volontairement PAS
    supprimés - ils restent un filet de rattrapage en cas de reset
    accidentel malgré les deux confirmations.
    """
    vault = db.query(VaultMeta).filter_by(id="main").first()
    if vault is None:
        raise HTTPException(status_code=404, detail="Aucun vault à réinitialiser.")

    kek = derive_key(payload.master_password, vault.argon2_salt)
    try:
        decrypted_dek = decrypt(vault.dek_nonce, vault.dek_ciphertext, kek)
        if decrypted_dek != dek:
            raise DecryptionError()
    except DecryptionError:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect - réinitialisation annulée.")

    db.query(Edge).delete(synchronize_session=False)
    db.query(Node).delete(synchronize_session=False)
    db.query(Credential).delete(synchronize_session=False)
    db.query(Note).delete(synchronize_session=False)
    db.query(Task).delete(synchronize_session=False)
    db.query(Email).delete(synchronize_session=False)
    db.query(Phone).delete(synchronize_session=False)
    db.query(Domain).delete(synchronize_session=False)
    db.query(Account).delete(synchronize_session=False)
    db.query(Identity).delete(synchronize_session=False)
    db.query(Tag).delete(synchronize_session=False)
    db.query(VaultMeta).delete(synchronize_session=False)
    db.commit()

    vault_session_store.lock(idenva_session)
    response.delete_cookie(COOKIE_NAME, path="/")

    return {"status": "vault_reset"}


@router.get("/backups/{filename}", response_model=ExportFile)
def download_backup(filename: str):
    if not BACKUP_FILENAME_PATTERN.match(filename):
        raise HTTPException(status_code=404, detail="Sauvegarde introuvable.")

    path = BACKUP_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Sauvegarde introuvable.")

    return json.loads(path.read_text())