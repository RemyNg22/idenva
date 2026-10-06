import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  t: (key: string) => string,
): string {
  if (!ownerId) return "—";
  if (ownerType === "identity") return identitiesById[ownerId]?.name ?? t("globalActivityPanel.deletedIdentity");
  if (ownerType === "account") return accountsById[ownerId]?.service_name ?? t("globalActivityPanel.deletedAccount");
  return "—";
}

export function GlobalActivityPanel({ identitiesById, accountsById, onClose }: GlobalActivityPanelProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<"tasks" | "notes">("tasks");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listTasks(), api.listNotes()])
      .then(([tRes, nRes]) => {
        setTasks(tRes);
        setNotes(nRes);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t("globalActivityPanel.errors.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleToggleTask(task: Task) {
    const nextStatus = task.status === "done" ? "todo" : "done";
    try {
      const updated = await api.updateTask(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
    } catch {
      setError(t("globalActivityPanel.errors.statusChangeFailed"));
    }
  }

  async function handleDeleteTask(id: string) {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError(t("globalActivityPanel.errors.deleteFailed"));
    }
  }

  async function handleDeleteNote(id: string) {
    try {
      await api.deleteNote(id);
      setNotes((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError(t("globalActivityPanel.errors.deleteFailed"));
    }
  }

  const pendingTasks = tasks.filter((item) => item.status !== "done");
  const doneTasks = tasks.filter((item) => item.status === "done");

  return (
    <div className="panel global-activity-panel">
      <div className="panel__header">
        <span className="panel__type">{t("globalActivityPanel.title")}</span>
        <button className="panel__close" onClick={onClose}>×</button>
      </div>

      <div className="global-activity-panel__tabs">
        <button
          className={tab === "tasks" ? "global-activity-panel__tab global-activity-panel__tab--active" : "global-activity-panel__tab"}
          onClick={() => setTab("tasks")}
        >
          {t("globalActivityPanel.tabs.tasks", { count: tasks.length })}
        </button>
        <button
          className={tab === "notes" ? "global-activity-panel__tab global-activity-panel__tab--active" : "global-activity-panel__tab"}
          onClick={() => setTab("notes")}
        >
          {t("globalActivityPanel.tabs.notes", { count: notes.length })}
        </button>
      </div>

      {error && <p className="panel__error">{error}</p>}
      {loading && <p className="global-activity-panel__empty">{t("globalActivityPanel.loading")}</p>}

      {!loading && tab === "tasks" && (
        <div className="global-activity-panel__list">
          {tasks.length === 0 ? (
            <p className="global-activity-panel__empty">{t("globalActivityPanel.emptyTasks")}</p>
          ) : (
            <>
              {pendingTasks.map((task) => (
                <div key={task.id} className="global-activity-panel__item">
                  <label className="global-activity-panel__item-main">
                    <input type="checkbox" checked={false} onChange={() => handleToggleTask(task)} />
                    <span>{task.title}</span>
                  </label>
                  <span className="global-activity-panel__owner">
                    {resolveOwnerLabel(task.related_type, task.related_id, identitiesById, accountsById, t)}
                  </span>
                  <button className="global-activity-panel__delete" onClick={() => handleDeleteTask(task.id)}>
                    {t("globalActivityPanel.buttons.delete")}
                  </button>
                </div>
              ))}
              {doneTasks.length > 0 && (
                <>
                  <p className="global-activity-panel__section-label">{t("globalActivityPanel.sections.completed")}</p>
                  {doneTasks.map((task) => (
                    <div key={task.id} className="global-activity-panel__item global-activity-panel__item--done">
                      <label className="global-activity-panel__item-main">
                        <input type="checkbox" checked={true} onChange={() => handleToggleTask(task)} />
                        <span className="global-activity-panel__done-text">{task.title}</span>
                      </label>
                      <span className="global-activity-panel__owner">
                        {resolveOwnerLabel(task.related_type, task.related_id, identitiesById, accountsById, t)}
                      </span>
                      <button className="global-activity-panel__delete" onClick={() => handleDeleteTask(task.id)}>
                        {t("globalActivityPanel.buttons.delete")}
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
            <p className="global-activity-panel__empty">{t("globalActivityPanel.emptyNotes")}</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="global-activity-panel__item global-activity-panel__item--note">
                <div className="global-activity-panel__note-content">{note.content}</div>
                <div className="global-activity-panel__note-footer">
                  <span className="global-activity-panel__owner">
                    {resolveOwnerLabel(note.owner_type, note.owner_id, identitiesById, accountsById, t)}
                  </span>
                  <button className="global-activity-panel__delete" onClick={() => handleDeleteNote(note.id)}>
                    {t("globalActivityPanel.buttons.delete")}
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