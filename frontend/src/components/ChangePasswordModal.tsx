import { useState } from "react";
import { api, ApiError } from "../services/api";
import "./ChangePasswordModal.css";

interface ChangePasswordModalProps {
  onClose: () => void;
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 12) {
      setError("Le nouveau mot de passe doit faire au moins 12 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await api.changeMasterPassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la modification.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>Changer le mot de passe maître</h2>

        {success ? (
          <div className="modal-success">Mot de passe maître mis à jour avec succès !</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-field">
              <label>Mot de passe actuel</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="modal-field">
              <label>Nouveau mot de passe (min. 12 car.)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="modal-field">
              <label>Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Modification..." : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}