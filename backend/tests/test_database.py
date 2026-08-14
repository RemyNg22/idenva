from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Identity


def test_create_and_read_identity(tmp_path):

    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    db = Session()
    identity = Identity(name="Cyber", description="Identité cybersécurité")
    db.add(identity)
    db.commit()
    db.refresh(identity)

    assert identity.id is not None
    assert identity.created_at is not None

    fetched = db.query(Identity).filter_by(name="Cyber").first()
    assert fetched is not None
    assert fetched.description == "Identité cybersécurité"

    db.close()