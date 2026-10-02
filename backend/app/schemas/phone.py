from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PhoneCreate(BaseModel):
    identity_id: str
    number: str


class PhoneUpdate(BaseModel):
    number: str


class PhoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    identity_id: str
    number: str
    created_at: datetime