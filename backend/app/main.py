from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.api.auth import router as auth_router
from app.api.accounts import router as accounts_router
from app.api.graph import router as graph_router
from app.api.identities import router as identities_router
from app.api.notes import router as notes_router
from app.api.task import router as tasks_router
from app.api.vault_export import router as vault_export_router
from app.config import settings
from app.database import init_db
from fastapi.middleware.cors import CORSMiddleware
from app.api.utils import router as utils_router
from app.api.dashboard import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(identities_router)
app.include_router(accounts_router)
app.include_router(graph_router)
app.include_router(utils_router)
app.include_router(notes_router)
app.include_router(tasks_router)
app.include_router(dashboard_router)
app.include_router(vault_export_router)


@app.get("/health")
def health():
    return {"status": "ok"}

dist_path = settings.frontend_dist_dir

if dist_path.exists():
    assets_path = dist_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        target_file = dist_path / full_path
        if full_path != "" and target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(dist_path / "index.html")