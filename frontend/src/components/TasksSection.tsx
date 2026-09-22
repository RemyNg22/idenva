import { useEffect, useState } from "react";
import { api, ApiError, type Task } from "../services/api";
import "./TasksSection.css";

interface TasksSectionProps {
  relatedId: string;
  relatedType?: "account" | "identity";
}

export function TasksSection({ relatedId, relatedType = "account" }: TasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTasks() {
    try {
      const data = await api.listTasks(relatedId, relatedType);
      setTasks(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec du chargement des tâches.");
    }
  }

  useEffect(() => {
    if (relatedId) loadTasks();
  }, [relatedId, relatedType]);

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.createTask({
        title: newTitle.trim(),
        related_id: relatedId,
        related_type: relatedType,
      });
      setNewTitle("");
      await loadTasks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la création.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(task: Task) {
    setError(null);
    const nextStatus = task.status === "done" ? "todo" : "done";
    try {
      await api.updateTask(task.id, { status: nextStatus });
      await loadTasks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec du changement de statut.");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await api.deleteTask(id);
      await loadTasks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la suppression.");
    }
  }

  return (
    <div className="tasks-section">
      <h4 className="tasks-section__title">Tâches à faire</h4>

      <form className="tasks-section__form" onSubmit={handleAddTask}>
        <input
          type="text"
          className="tasks-section__input"
          placeholder="Nouvelle tâche..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button type="submit" className="tasks-section__btn" disabled={loading || !newTitle.trim()}>
          Ajouter
        </button>
      </form>

      {error && <p className="tasks-section__error">{error}</p>}

      {tasks.length === 0 ? (
        <p className="tasks-section__empty">Aucune tâche enregistrée.</p>
      ) : (
        <ul className="tasks-section__list">
          {tasks.map((task) => {
            const isDone = task.status === "done";
            return (
              <li key={task.id} className="tasks-section__item">
                <label className="tasks-section__label">
                  <input
                    type="checkbox"
                    className="tasks-section__checkbox"
                    checked={isDone}
                    onChange={() => handleToggleStatus(task)}
                  />
                  <span className={`tasks-section__text ${isDone ? "tasks-section__text--done" : ""}`}>
                    {task.title}
                  </span>
                </label>
                <button
                  type="button"
                  className="tasks-section__btn tasks-section__btn--danger"
                  onClick={() => handleDelete(task.id)}
                >
                  Supprimer
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}