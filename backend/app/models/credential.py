import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Credential(Base):
    """Secret générique : clé API, clé SSH, etc - tout ce qui n'est pas
    un mot de passe de compte ou un TOTP déjà couverts par account."""

    __tablename__ = "credentials"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_type: Mapped[str] = mapped_column(String, nullable=False)
    owner_id: Mapped[str] = mapped_column(String, nullable=False)

    label: Mapped[str] = mapped_column(String, nullable=False)
    secret_type: Mapped[str] = mapped_column(String, nullable=False)
    secret_ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    secret_nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    def __repr__(self) -> str:
        return f"<Credential id={self.id} label={self.label!r}>"