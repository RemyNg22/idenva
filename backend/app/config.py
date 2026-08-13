from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Paramètres de config d'Idenva
    Lu depuis les variables d'environnement ou un fichier
    .env à la racine
    """
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name :str ="Idenva API"

    host: str = "127.0.0.1"
    port: int = 8000

    data_dir: Path = Path(__file__).resolve().parent.parent.parent / "data"

settings = Settings()

settings.data_dir.mkdir(parents=True, exist_ok=True)