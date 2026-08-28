from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AccountCreate(BaseModel):
    identity_id: str
    service_name: str
    url: str | None = None
    username: str | None = None
    email_id: str | None = None
    password: str | None = None # chiffré avant stockage
    totp_secret: str | None = None  # idem
    has_2fa: bool = False
    account_type: str | None = None
    importance: int = 0


class AccountUpdate(BaseModel):
    service_name: str | None = None
    url: str | None = None
    username: str | None = None
    email_id: str | None = None
    password: str | None = None
    totp_secret: str | None = None
    has_2fa: bool | None = None
    account_type: str | None = None
    importance: int | None = None


class AccountOut(BaseModel):
    """Ne contient jamais de secret en clair, ce sont de simples booléens, la valeur réelle passe par /reveal."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    identity_id: str
    service_name: str
    url: str | None
    username: str | None
    email_id: str | None
    has_2fa: bool
    has_password: bool
    has_totp: bool
    account_type: str | None
    importance: int
    created_at: datetime
    updated_at: datetime
    last_password_change: datetime | None


class RevealedSecret(BaseModel):
    value: str