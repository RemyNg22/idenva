from datetime import datetime

from pydantic import BaseModel, ConfigDict


class IdentityBase(BaseModel):
    name: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    tags: list[str] | None = None
    importance: int = 0


class IdentityCreate(IdentityBase):
    pass


class IdentityUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    tags: list[str] | None = None
    importance: int | None = None


class IdentityOut(IdentityBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at:datetime
    updated_at: datetime