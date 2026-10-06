import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../services/api";
import "./ChangePasswordModal.css";

interface ChangePasswordModalProps {
  onClose: () => void;
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { t } = useTranslation();
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
      setError(t("changePasswordModal.errors.minLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("changePasswordModal.errors.mismatch"));
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
      setError(err instanceof ApiError ? err.message : t("changePasswordModal.errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>{t("changePasswordModal.title")}</h2>

        {success ? (
          <div className="modal-success">{t("changePasswordModal.success")}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-field">
              <label>{t("changePasswordModal.currentPasswordLabel")}</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="modal-field">
              <label>{t("changePasswordModal.newPasswordLabel")}</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="modal-field">
              <label>{t("changePasswordModal.confirmPasswordLabel")}</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                {t("changePasswordModal.buttons.cancel")}
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? t("changePasswordModal.buttons.saving") : t("changePasswordModal.buttons.save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}