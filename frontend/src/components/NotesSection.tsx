import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type Note } from "../services/api";
import "./NotesSection.css";

interface NotesSectionProps {
  ownerId: string;
  ownerType?: "account" | "identity";
}

export function NotesSection({ ownerId, ownerType = "account" }: NotesSectionProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNotes() {
    try {
      const data = await api.listNotes(ownerId, ownerType);
      setNotes(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("notesSection.errors.loadFailed"));
    }
  }

  useEffect(() => {
    if (ownerId) loadNotes();
  }, [ownerId, ownerType]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.createNote({ owner_id: ownerId, owner_type: ownerType, content: newContent.trim() });
      setNewContent("");
      await loadNotes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("notesSection.errors.addFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(id: string) {
    if (!editContent.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.updateNote(id, editContent.trim());
      setEditingId(null);
      await loadNotes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("notesSection.errors.updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await api.deleteNote(id);
      await loadNotes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("notesSection.errors.deleteFailed"));
    }
  }

  return (
    <div className="notes-section">
      <h4 className="notes-section__title">{t("notesSection.title")}</h4>

      <form className="notes-section__form" onSubmit={handleAddNote}>
        <input
          type="text"
          className="notes-section__input"
          placeholder={t("notesSection.placeholder")}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
        />
        <button type="submit" className="notes-section__btn" disabled={loading || !newContent.trim()}>
          {t("notesSection.buttons.add")}
        </button>
      </form>

      {error && <p className="notes-section__error">{error}</p>}

      {notes.length === 0 ? (
        <p className="notes-section__empty">{t("notesSection.empty")}</p>
      ) : (
        <ul className="notes-section__list">
          {notes.map((note) => (
            <li key={note.id} className="notes-section__item">
              {editingId === note.id ? (
                <div className="notes-section__edit-row">
                  <input
                    type="text"
                    className="notes-section__input"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <button type="button" className="notes-section__btn" onClick={() => handleSaveEdit(note.id)}>
                    {t("notesSection.buttons.ok")}
                  </button>
                  <button type="button" className="notes-section__btn" onClick={() => setEditingId(null)}>
                    {t("notesSection.buttons.cancel")}
                  </button>
                </div>
              ) : (
                <>
                  <span className="notes-section__content">{note.content}</span>
                  <div className="notes-section__actions">
                    <button
                      type="button"
                      className="notes-section__btn"
                      onClick={() => {
                        setEditingId(note.id);
                        setEditContent(note.content);
                      }}
                    >
                      {t("notesSection.buttons.edit")}
                    </button>
                    <button
                      type="button"
                      className="notes-section__btn notes-section__btn--danger"
                      onClick={() => handleDelete(note.id)}
                    >
                      {t("notesSection.buttons.delete")}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}