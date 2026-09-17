import { useState } from "react";
import { api, ApiError, type Account } from "../services/api";
import { PasswordField } from "../components/PasswordField";
import "./Panel.css";

interface AccountPanelProps {
  account: Account;
  onClose: () => void;
  onAccountUpdated: (account: Account) => void;
  onAccountDeleted: (accountId: string) => void;
}

export function AccountPanel({ account, onClose, onAccountUpdated, onAccountDeleted }: AccountPanelProps) {
  const [serviceName, setServiceName] = useState(account.service_name);
  const [username, setUsername] = useState(account.username ?? "");
  const [url, setUrl] = useState(account.url ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveDetails() {
    try {
      const updated = await api.updateAccount(account.id, {
        service_name: serviceName,
        username: username || undefined,
        url: url || undefined,
      });
      onAccountUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la sauvegarde.");
    }
  }

  async function handleSetPassword() {
    if (!newPassword) return;
    try {
      const updated = await api.updateAccount(account.id, { password: newPassword });
      onAccountUpdated(updated);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la mise à jour du mot de passe.");
    }
  }

  async function handleToggle2fa() {
    try {
      const updated = await api.updateAccount(account.id, { has_2fa: !account.has_2fa });
      onAccountUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la mise à jour.");
    }
  }

  async function handleDelete() {
    try {
      await api.deleteAccount(account.id);
      onAccountDeleted(account.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la suppression.");
    }
  }

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__type">Compte</span>
        <button className="panel__close" onClick={onClose}>×</button>
      </div>

      <label className="panel__label">Service</label>
      <input className="panel__input" value={serviceName} onChange={(e) => setServiceName(e.target.value)} onBlur={handleSaveDetails} />

      <label className="panel__label">Nom d'utilisateur</label>
      <input className="panel__input" value={username} onChange={(e) => setUsername(e.target.value)} onBlur={handleSaveDetails} />

      <label className="panel__label">URL</label>
      <input className="panel__input" value={url} onChange={(e) => setUrl(e.target.value)} onBlur={handleSaveDetails} />

      <label className="panel__label">Mot de passe</label>
      <PasswordField mode="reveal" accountId={account.id} secretType="password" hasSecret={account.has_password} />

      <label className="panel__label panel__label--spaced">Changer le mot de passe</label>
      <PasswordField mode="new" value={newPassword} onChange={setNewPassword} />
      {newPassword && (
        <button className="panel__btn" onClick={handleSetPassword} style={{ marginTop: 8 }}>
          Enregistrer le nouveau mot de passe
        </button>
      )}

      <label className="panel__label panel__label--spaced">
        <input type="checkbox" checked={account.has_2fa} onChange={handleToggle2fa} /> 2FA activée
      </label>

      {account.last_password_change && (
        <p className="panel__meta">
          Dernier changement : {new Date(account.last_password_change).toLocaleDateString("fr-FR")}
        </p>
      )}

      {error && <p className="panel__error">{error}</p>}

      <div className="panel__danger-zone">
        {!showDeleteConfirm ? (
          <button className="panel__btn panel__btn--danger" onClick={() => setShowDeleteConfirm(true)}>
            Supprimer ce compte
          </button>
        ) : (
          <div className="panel__confirm">
            <p>Supprimer "{account.service_name}" ? Cette action est irréversible.</p>
            <div className="panel__confirm-actions">
              <button className="panel__btn panel__btn--danger" onClick={handleDelete}>Confirmer</button>
              <button className="panel__btn" onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}