"""Route "mot de passe oublié" : efface tout le coffre quand il est verrouillé.
Même suppression que /api/vault/reset (vault_export.py), sans mot de passe,
mais uniquement si le coffre est verrouillé. Les backups sur disque sont conservés."""
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.auth import COOKIE_NAME
from app.database import get_db
from app.models import Account, Credential, Domain, Edge, Email, Identity, Node, Note, Phone, Tag, Task, VaultMeta
from app.security.vault_session import vault_session_store

router = APIRouter(prefix="/api/vault", tags=["vault"])

CONFIRM_WORDS = {"SUPPRIMER", "DELETE"}
LOOPBACK = {"127.0.0.1", "::1", "localhost"}


class ForgotResetIn(BaseModel):
    confirmation: str


@router.post("/forgot-reset")
def forgot_reset(
    payload: ForgotResetIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    idenva_session: str | None = Cookie(default=None)):
    if request.client is None or request.client.host not in LOOPBACK:
        raise HTTPException(status_code=403, detail="Accès refusé.")

    # Coffre déverrouillé : utiliser la réinitialisation normale (avec mot de passe).
    if vault_session_store.is_unlocked(idenva_session):
        raise HTTPException(status_code=409, detail="Le coffre est déverrouillé.")

    if payload.confirmation.strip().upper() not in CONFIRM_WORDS:
        raise HTTPException(status_code=422, detail="Confirmation incorrecte.")

    for model in (Edge, Node, Credential, Note, Task, Email, Phone, Domain, Account, Identity, Tag, VaultMeta):
        db.query(model).delete(synchronize_session=False)
    db.commit()

    # Nettoyage et défragmentation du fichier SQLite pour libérer l'espace disque
    try:
        db.execute(text("VACUUM"))
        db.commit()
    except Exception:
        pass

    # Invalider toute session résiduelle (DEK en mémoire).
    for token in list(vault_session_store._sessions.keys()):
        vault_session_store.lock(token)
    response.delete_cookie(COOKIE_NAME, path="/")

    return {"status": "vault_reset"}