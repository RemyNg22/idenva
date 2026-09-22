from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_dek
from app.database import get_db
from app.models import Note
from app.schemas.note import NoteCreate, NoteOut, NoteUpdate
from app.security.crypto import decrypt, encrypt

router = APIRouter(prefix="/api/notes", tags=["notes"], dependencies=[Depends(get_current_dek)])


def _to_out(note: Note, dek: bytes) -> NoteOut:
    plaintext = decrypt(note.content_nonce, note.content_ciphertext, dek)
    return NoteOut(
        id=note.id,
        owner_type=note.owner_type,
        owner_id=note.owner_id,
        content=plaintext.decode("utf-8"),
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.get("", response_model=list[NoteOut])
def list_notes(
    owner_type: str | None = None,
    owner_id: str | None = None,
    dek: bytes = Depends(get_current_dek),
    db: Session = Depends(get_db),
):
    query = db.query(Note)
    if owner_type:
        query = query.filter_by(owner_type=owner_type)
    if owner_id:
        query = query.filter_by(owner_id=owner_id)
    return [_to_out(n, dek) for n in query.all()]


@router.post("", response_model=NoteOut, status_code=201)
def create_note(payload: NoteCreate, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)):
    nonce, ciphertext = encrypt(payload.content.encode("utf-8"), dek)
    note = Note(
        owner_type=payload.owner_type,
        owner_id=payload.owner_id,
        content_nonce=nonce,
        content_ciphertext=ciphertext,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return _to_out(note, dek)


@router.put("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: str, payload: NoteUpdate, dek: bytes = Depends(get_current_dek), db: Session = Depends(get_db)
):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note introuvable.")

    nonce, ciphertext = encrypt(payload.content.encode("utf-8"), dek)
    note.content_nonce = nonce
    note.content_ciphertext = ciphertext

    db.commit()
    db.refresh(note)
    return _to_out(note, dek)


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: str, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note introuvable.")
    db.delete(note)
    db.commit()