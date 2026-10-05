import { useEffect, useState } from "react";
import { api, ApiError, type Account, type Identity, type Note, type Task } from "../services/api";
import "../panels/Panel.css";
import "./GlobalActivityPanel.css";

interface GlobalActivityPanelProps {
  identitiesById: Record<string, Identity>;
  accountsById: Record<string, Account>;
  onClose: () => void;
}

function resolveOwnerLabel(
  ownerType: string | null,
  ownerId: string | null,
  identitiesById: Record<string, Identity>,
  accountsById: Record<string, Account>,
): string {
  if (!ownerId) return "—";
  if (ownerType === "identity") return identitiesById[ownerId]?.name ?? "Identité supprimée";
  if (ownerType === "account") return accountsById[ownerId]?.service_name ?? "Compte supprimé";
  return "—";
}

export function GlobalActivityPanel({ identitiesById, accountsById, onClose }: GlobalActivityPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<"tasks" | "notes">("tasks");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listTasks(), api.listNotes()])
      .then(([t, n]) => {
        setTasks(t);
        setNotes(n);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Échec du chargement."))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleTask(task: Task) {
    const nextStatus = task.status === "done" ? "todo" : "done";
    try {
      const updated = await api.updateTask(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch {
      setError("Échec du changement de statut.");
    }
  }

  async function handleDeleteTask(id: string) {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError("Échec de la suppression.");
    }
  }

  async function handleDeleteNote(id: string) {
    try {
      await api.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setError("Échec de la suppression.");
    }
  }

  const pendingTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="panel global-activity-panel">
      <div className="panel__header">
        <span className="panel__type">Notes & Tâches</span>
        <button className="panel__close" onClick={onClose}>×</button>
      </div>

      <div className="global-activity-panel__tabs">
        <button
          className={tab === "tasks" ? "global-activity-panel__tab global-activity-panel__tab--active" : "global-activity-panel__tab"}
          onClick={() => setTab("tasks")}
        >
          Tâches ({tasks.length})
        </button>
        <button
          className={tab === "notes" ? "global-activity-panel__tab global-activity-panel__tab--active" : "global-activity-panel__tab"}
          onClick={() => setTab("notes")}
        >
          Notes ({notes.length})
        </button>
      </div>

      {error && <p className="panel__error">{error}</p>}
      {loading && <p className="global-activity-panel__empty">Chargement...</p>}

      {!loading && tab === "tasks" && (
        <div className="global-activity-panel__list">
          {tasks.length === 0 ? (
            <p className="global-activity-panel__empty">Aucune tâche enregistrée.</p>
          ) : (
            <>
              {pendingTasks.map((task) => (
                <div key={task.id} className="global-activity-panel__item">
                  <label className="global-activity-panel__item-main">
                    <input type="checkbox" checked={false} onChange={() => handleToggleTask(task)} />
                    <span>{task.title}</span>
                  </label>
                  <span className="global-activity-panel__owner">
                    {resolveOwnerLabel(task.related_type, task.related_id, identitiesById, accountsById)}
                  </span>
                  <button className="global-activity-panel__delete" onClick={() => handleDeleteTask(task.id)}>
                    Supprimer
                  </button>
                </div>
              ))}
              {doneTasks.length > 0 && (
                <>
                  <p className="global-activity-panel__section-label">Terminées</p>
                  {doneTasks.map((task) => (
                    <div key={task.id} className="global-activity-panel__item global-activity-panel__item--done">
                      <label className="global-activity-panel__item-main">
                        <input type="checkbox" checked={true} onChange={() => handleToggleTask(task)} />
                        <span className="global-activity-panel__done-text">{task.title}</span>
                      </label>
                      <span className="global-activity-panel__owner">
                        {resolveOwnerLabel(task.related_type, task.related_id, identitiesById, accountsById)}
                      </span>
                      <button className="global-activity-panel__delete" onClick={() => handleDeleteTask(task.id)}>
                        Supprimer
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {!loading && tab === "notes" && (
        <div className="global-activity-panel__list">
          {notes.length === 0 ? (
            <p className="global-activity-panel__empty">Aucune note enregistrée.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="global-activity-panel__item global-activity-panel__item--note">
                <div className="global-activity-panel__note-content">{note.content}</div>
                <div className="global-activity-panel__note-footer">
                  <span className="global-activity-panel__owner">
                    {resolveOwnerLabel(note.owner_type, note.owner_id, identitiesById, accountsById)}
                  </span>
                  <button className="global-activity-panel__delete" onClick={() => handleDeleteNote(note.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}