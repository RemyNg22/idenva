from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from app.config import settings

DATABASE_PATH = settings.data_dir / "idenva.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    """
    Classe de base pour tous les modèles SQLAlchemy du projet
    """
    pass

def init_db():
    """
    Créer les tables qui n'existent pas encore à partir des modèles importés.
    Ne touche pas aux tables déjà existantes
    """
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Fournit une session DB par requête fermée automatiquement à la fin, même en cas d'erreur.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()