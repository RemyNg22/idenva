from datetime import datetime, timezone

from sqlalchemy import DateTime, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class VaultMeta(Base):
    """
    Un coffre fort par installation d'Idenva. Aucun hash de vérification de mdp n'est stocké (kek_verifier), quand on déchiffre la DEK et que c'est bon, 
    c'est la preuve que le mot de passe est correct."""

    __tablename__ = "vault_meta"

    id: Mapped[str] = mapped_column(String, primary_key=True, default="main")
    argon2_salt: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    dek_ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    dek_nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)