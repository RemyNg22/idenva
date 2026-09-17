from pydantic import BaseModel


class GeneratedPassword(BaseModel):
    password: str