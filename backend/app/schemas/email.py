from datetime import datetime
from pydantic import BaseModel, ConfigDict


class EmailCreate(BaseModel):
    account_id: str
    address: str
    is_sensitive: bool = False


class EmailUpdate(BaseModel):
    address: str | None = None
    is_sensitive: bool | None = None


class EmailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    identity_id: str
    account_id: str | None = None
    address: str
    is_sensitive: bool
    created_at: datetime