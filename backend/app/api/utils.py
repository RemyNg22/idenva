import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.auth import get_current_dek
from app.schemas.utils import GeneratedPassword

router = APIRouter(prefix="/api/utils", tags=["utils"], dependencies=[Depends(get_current_dek)])


@router.get("/generate-password", response_model=GeneratedPassword)
def generate_password(
    length: int = Query(default=24, ge=8, le=128),
    uppercase: bool = True,
    lowercase: bool = True,
    numbers: bool = True,
    symbols: bool = True):

    pool = ""
    if uppercase:
        pool += string.ascii_uppercase
    if lowercase:
        pool += string.ascii_lowercase
    if numbers:
        pool += string.digits
    if symbols:
        pool += "!@#$%^&*()-_=+[]{}"

    if not pool:
        raise HTTPException(status_code=422, detail="Sélectionne au moins un type de caractère.")

    password = "".join(secrets.choice(pool) for _ in range(length))
    return GeneratedPassword(password=password)