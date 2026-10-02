import sys
from pathlib import Path
from platformdirs import user_data_dir
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_NAME = "Idenva"


def get_data_directory() -> Path:
    """Stocke la BDD dans un dossier utilisateur stable (ex: %APPDATA%/Idenva)."""
    if getattr(sys, "frozen", False):
        path = Path(user_data_dir(appname=APP_NAME, appauthor=False))
    else:
        path = Path(__file__).resolve().parent.parent.parent / "data"

    path.mkdir(parents=True, exist_ok=True)
    return path


def get_frontend_dist_directory() -> Path:
    """Retrouve le dossier dist React embarqué dans l'exécutable"""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "frontend_dist"
    return Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Idenva API"
    host: str = "127.0.0.1"
    port: int = 8000
    vault_session_timeout_minutes: int = 15

    data_dir: Path = get_data_directory()
    frontend_dist_dir: Path = get_frontend_dist_directory()


settings = Settings()