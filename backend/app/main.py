from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.accounts import router as accounts_router
from app.api.graph import router as graph_router
from app.api.identities import router as identities_router
from app.api.notes import router as notes_router
from app.api.task import router as tasks_router
from app.config import settings
from app.database import init_db
from app.api.utils import router as utils_router
from app.api.dashboard import router as dashboard_router
from app.api.vault_export import router as vault_export_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"])

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

if settings.frontend_dist_dir.exists():
    if (settings.frontend_dist_dir / "assets").exists():
        app.mount("/assets", StaticFiles(directory=settings.frontend_dist_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = settings.frontend_dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(settings.frontend_dist_dir / "index.html")