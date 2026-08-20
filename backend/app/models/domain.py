import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Domain(Base):
    __tablename__ = "domains"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    identity_id: Mapped[str] = mapped_column(ForeignKey("identities.id"), nullable=False)

    domain_name: Mapped[str] = mapped_column(String, nullable=False)
    registrar: Mapped[str | None] = mapped_column(String, nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    def __repr__(self) -> str:
        return f"<Domain id={self.id} name={self.domain_name!r}>"