import json
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.auth import get_current_dek
from app.config import settings
from app.database import get_db
from app.schemas.export import BackupInfo, ExportFile, ExportPasswordIn, ImportIn, ImportSummary
from app.security.crypto import DecryptionError
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


@router.get("/backups/{filename}", response_model=ExportFile)
def download_backup(filename: str):
    if not BACKUP_FILENAME_PATTERN.match(filename):
        raise HTTPException(status_code=404, detail="Sauvegarde introuvable.")

    path = BACKUP_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Sauvegarde introuvable.")

    return json.loads(path.read_text())