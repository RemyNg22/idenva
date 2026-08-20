import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    identity_id: Mapped[str] = mapped_column(ForeignKey("identities.id"), nullable=False)

    service_name: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    username: Mapped[str | None] = mapped_column(String, nullable=True)
    email_id: Mapped[str | None] = mapped_column(ForeignKey("emails.id"), nullable=True)

    password_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    password_nonce: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    totp_ciphertext: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    totp_nonce: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    has_2fa: Mapped[bool] = mapped_column(Boolean, default=False)
    account_type: Mapped[str | None] = mapped_column(String, nullable=True)
    importance: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    last_password_change: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<Account id={self.id} service={self.service_name!r}>"