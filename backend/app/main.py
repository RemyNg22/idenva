from fastapi import FastAPI
from app.config import settings

app = FastAPI(title="settings.app_name")


@app.get("/health")
def health():
    return {"status": "ok"}