import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Phone(Base):
    __tablename__ = "phones"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    identity_id: Mapped[str] = mapped_column(ForeignKey("identities.id"), nullable=False)

    number_ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    number_nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    def __repr__(self) -> str:
        return f"<Phone id={self.id}>"