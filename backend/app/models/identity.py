import uuid
from datetime import datetime, timezone
from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Identity(Base):
    """
    Initiation de la table 'identities'.

    Une identité ne contient aucun secret (pas de mot de passe,
    pas de TOTP), ce sont les comptes qui en portent.
    """

    __tablename__ = "identities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    icon: Mapped[str | None] = mapped_column(String, nullable=True)
    color: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    importance: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    def __repr__(self) -> str:
        return f"<Identity id={self.id} name={self.name!r}>"