from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DomainCreate(BaseModel):
    identity_id: str
    domain_name: str
    registrar: str | None = None
    expiry_date: datetime | None = None


class DomainUpdate(BaseModel):
    domain_name: str | None = None
    registrar: str | None = None
    expiry_date: datetime | None = None


class DomainOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    identity_id: str
    domain_name: str
    registrar: str | None
    expiry_date: datetime | None
    created_at: datetime