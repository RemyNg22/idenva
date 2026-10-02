import sys
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

IS_FROZEN = getattr(sys, "frozen", False)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Idenva API"
    host: str = "127.0.0.1"
    port: int = 8000

    if IS_FROZEN:
        data_dir: Path = Path.home() / "AppData" / "Roaming" / "Idenva"
    else:
        data_dir: Path = Path(__file__).resolve().parent.parent.parent / "data"

    if IS_FROZEN:
        frontend_dist_dir: Path = Path(sys._MEIPASS) / "frontend_dist"
    else:
        frontend_dist_dir: Path = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

    vault_session_timeout_minutes: int = 15

settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)