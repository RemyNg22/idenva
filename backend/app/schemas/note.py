from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NoteCreate(BaseModel):
    owner_type: str = "account"
    owner_id: str
    content: str  # Sera chiffré avant enregistrement


class NoteUpdate(BaseModel):
    content: str


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_type: str
    owner_id: str
    content: str  # Déchiffré à la volée
    created_at: datetime
    updated_at: datetime