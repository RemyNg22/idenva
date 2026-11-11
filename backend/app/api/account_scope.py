from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Account


def get_account_or_404(db: Session, account_id: str) -> Account:
    """Un e-mail, un téléphone ou un domaine appartient à un compte et pas à une identité;
    l'identity_id en est déduit côté serveur"""
    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Compte introuvable.")
    return account