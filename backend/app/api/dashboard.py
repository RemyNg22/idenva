from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import get_current_dek
from app.database import get_db
from app.schemas.dashboard import SecurityDashboard
from app.services.security_analysis import build_security_dashboard

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_dek)])


@router.get("/security", response_model=SecurityDashboard)
def get_security_dashboard(dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    return build_security_dashboard(db, dek)