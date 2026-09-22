import { useState, type FormEvent } from "react";
import { api, ApiError, type Account, type Identity } from "../services/api";
import { NotesSection } from "../components/NotesSection";
import { TasksSection } from "../components/TasksSection";
import "./Panel.css";

interface IdentityPanelProps {
  identity: Identity;
  accounts: Account[];
  onClose: () => void;
  onIdentityUpdated: (identity: Identity) => void;
  onIdentityDeleted: (identityId: string) => void;
  onAccountCreated: (account: Account) => void;
  onSelectAccount: (accountId: string) => void;
}

export function IdentityPanel({
  identity,
  accounts,
  onClose,
  onIdentityUpdated,
  onIdentityDeleted,
  onAccountCreated,
  onSelectAccount,
}: IdentityPanelProps) {
  const [name, setName] = useState(identity.name);
  const [description, setDescription] = useState(identity.description ?? "");
  const [newAccountName, setNewAccountName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveDetails() {
    try {
      const updated = await api.updateIdentity(identity.id, { name, description: description || undefined });
      onIdentityUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la sauvegarde.");
    }
  }

  async function handleAddAccount(e: FormEvent) {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    try {
      const account = await api.createAccount({ identity_id: identity.id, service_name: newAccountName.trim() });
      onAccountCreated(account);
      setNewAccountName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la création du compte.");
    }
  }

  async function handleDelete() {
    try {
      await api.deleteIdentity(identity.id);
      onIdentityDeleted(identity.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la suppression.");
    }
  }

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__type">IDENTITY</span>
        <button className="panel__close" onClick={onClose}>×</button>
      </div>

      <label className="panel__label">Nom</label>
      <input className="panel__input" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSaveDetails} />

      <label className="panel__label">Description</label>
      <textarea
        className="panel__textarea"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={handleSaveDetails}
        rows={3}
      />

      {error && <p className="panel__error">{error}</p>}

      <div className="panel__section-title">
        Comptes ({accounts.length})
      </div>
      <ul className="panel__account-list">
        {accounts.map((account) => (
          <li key={account.id} className="panel__account-item" onClick={() => onSelectAccount(account.id)}>
            <span>{account.service_name}</span>
            {account.has_password && <span className="panel__account-badge">🔑</span>}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAddAccount} className="panel__add-form">
        <input
          className="panel__input"
          placeholder="Nom du service (ex: GitHub)"
          value={newAccountName}
          onChange={(e) => setNewAccountName(e.target.value)}
        />
        <button type="submit" className="panel__btn">+ Ajouter un compte</button>
      </form>

      <NotesSection ownerId={identity.id} ownerType="identity" />
      <TasksSection relatedId={identity.id} relatedType="identity" />

      <div className="panel__danger-zone">
        {!showDeleteConfirm ? (
          <button className="panel__btn panel__btn--danger" onClick={() => setShowDeleteConfirm(true)}>
            Supprimer cette identité
          </button>
        ) : (
          <div className="panel__confirm">
            <p>
              Supprimer "{identity.name}" et ses {accounts.length} compte{accounts.length > 1 ? "s" : ""} ?
              Cette action est irréversible.
            </p>
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