from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.accounts import router as accounts_router
from app.api.identities import router as identities_router
from app.config import settings
from app.database import init_db
from app.models import Identity


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.include_router(auth_router)
app.include_router(identities_router)
app.include_router(accounts_router)


@app.get("/health")
def health():
    return {"status": "ok"}