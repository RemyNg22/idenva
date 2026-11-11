from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.account_scope import get_account_or_404
from app.api.auth import get_current_dek
from app.database import get_db
from app.models import Domain
from app.schemas.domain import DomainCreate, DomainOut, DomainUpdate

router = APIRouter(prefix="/api/domains", tags=["domains"], dependencies=[Depends(get_current_dek)])


@router.get("", response_model=list[DomainOut])
def list_domains(identity_id: str | None = None, account_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Domain)
    if account_id:
        query = query.filter_by(account_id=account_id)
    if identity_id:
        query = query.filter_by(identity_id=identity_id)
    return query.all()


@router.post("", response_model=DomainOut, status_code=201)
def create_domain(payload: DomainCreate, db: Session = Depends(get_db)):
    account = get_account_or_404(db, payload.account_id)
    data = payload.model_dump(exclude={"account_id"})
    domain = Domain(**data, identity_id=account.identity_id, account_id=account.id)
    db.add(domain)
    db.commit()
    db.refresh(domain)
    return domain


@router.put("/{domain_id}", response_model=DomainOut)
def update_domain(domain_id: str, payload: DomainUpdate, db: Session = Depends(get_db)):
    domain = db.get(Domain, domain_id)
    if domain is None:
        raise HTTPException(status_code=404, detail="Domaine introuvable.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(domain, field, value)
    db.commit()
    db.refresh(domain)
    return domain


@router.delete("/{domain_id}", status_code=204)
def delete_domain(domain_id: str, db: Session = Depends(get_db)):
    domain = db.get(Domain, domain_id)
    if domain is None:
        raise HTTPException(status_code=404, detail="Domaine introuvable.")
    db.delete(domain)
    db.commit()