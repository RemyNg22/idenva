from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CredentialCreate(BaseModel):
    owner_type: str  # "identity" | "account"
    owner_id: str
    label: str
    secret_type: str  # "api_key" | "ssh_key" | ...
    secret: str


class CredentialUpdate(BaseModel):
    label: str | None = None
    secret_type: str | None = None
    secret: str | None = None


class CredentialOut(BaseModel):
    """Jamais le secret en clair par défaut, même logique que les mots
    de passe de compte"""
    model_config = ConfigDict(from_attributes=True)
    id: str
    owner_type: str
    owner_id: str
    label: str
    secret_type: str
    created_at: datetime


class RevealedCredential(BaseModel):
    value: str