import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Email(Base):
    __tablename__ = "emails"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    identity_id: Mapped[str] = mapped_column(ForeignKey("identities.id"), nullable=False)

    address: Mapped[str | None] = mapped_column(String, nullable=True)
    address_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    address_nonce: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    def __repr__(self) -> str:
        return f"<Email id={self.id}>"