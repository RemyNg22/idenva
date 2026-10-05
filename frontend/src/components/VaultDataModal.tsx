import { useEffect, useState } from "react";
import { api, ApiError, type BackupInfo, type ExportFile, type ImportSummary } from "../services/api";
import "./VaultDataModal.css";

interface VaultDataModalProps {
  onClose: () => void;
  onImported: () => void;
}

type Tab = "export" | "import" | "backups" | "reset";

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function VaultDataModal({ onClose, onImported }: VaultDataModalProps) {
  const [tab, setTab] = useState<Tab>("export");

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card--wide">
        <div className="vault-modal__tabs">
          <button className={tab === "export" ? "vault-modal__tab vault-modal__tab--active" : "vault-modal__tab"} onClick={() => setTab("export")}>
            Export
          </button>
          <button className={tab === "import" ? "vault-modal__tab vault-modal__tab--active" : "vault-modal__tab"} onClick={() => setTab("import")}>
            Import
          </button>
          <button className={tab === "backups" ? "vault-modal__tab vault-modal__tab--active" : "vault-modal__tab"} onClick={() => setTab("backups")}>
            Sauvegardes
          </button>
          <button className={tab === "reset" ? "vault-modal__tab vault-modal__tab--danger vault-modal__tab--active" : "vault-modal__tab vault-modal__tab--danger"} onClick={() => setTab("reset")}>
            Réinitialisation
          </button>
        </div>

        {tab === "export" && <ExportTab />}
        {tab === "import" && <ImportTab onImported={onImported} />}
        {tab === "backups" && <BackupsTab />}
        {tab === "reset" && <ResetTab />}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function ExportTab() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleExport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError("Le mot de passe d'export doit faire au moins 12 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const file = await api.exportVault(password);
      downloadJson(file, `idenva-export-${new Date().toISOString().slice(0, 10)}.json`);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de l'export.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleExport}>
      <p className="vault-modal__hint">
        Choisis un mot de passe d'export <strong>différent</strong> de ton mot de passe maître. Il te sera
        redemandé pour ré-importer ce fichier plus tard.
      </p>
      {error && <div className="modal-error">{error}</div>}
      {success && <div className="modal-success">Fichier d'export téléchargé.</div>}

      <div className="modal-field">
        <label>Mot de passe d'export (min. 12 car.)</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="modal-field">
        <label>Confirmer le mot de passe d'export</label>
        <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Export en cours..." : "Exporter et télécharger"}
      </button>
    </form>
  );
}

function ImportTab({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSummary(null);

    if (!file) {
      setError("Choisis un fichier d'export.");
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const exportData: ExportFile = JSON.parse(text);
      const result = await api.importVault(password, exportData);
      setSummary(result);
      onImported();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof SyntaxError) {
        setError("Ce fichier n'est pas un export Idenva valide.");
      } else {
        setError("Échec de l'import.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleImport}>
      <p className="vault-modal__hint">
        Les données importées créent de nouvelles identités et comptes - rien n'écrase tes données existantes.
      </p>
      {error && <div className="modal-error">{error}</div>}
      {summary && (
        <div className="modal-success">
          Importé : {summary.identities_imported} identité(s), {summary.accounts_imported} compte(s),{" "}
          {summary.notes_imported} note(s), {summary.tasks_imported} tâche(s).
        </div>
      )}

      <div className="modal-field">
        <label>Fichier d'export (.json)</label>
        <input type="file" accept="application/json" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="modal-field">
        <label>Mot de passe d'export</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Import en cours..." : "Importer"}
      </button>
    </form>
  );
}

function BackupsTab() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function loadBackups() {
    api.listBackups().then(setBackups).catch(() => setError("Échec du chargement des sauvegardes."));
  }

  useEffect(loadBackups, []);

  async function handleCreateBackup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 12) {
      setError("Le mot de passe de sauvegarde doit faire au moins 12 caractères.");
      return;
    }

    setLoading(true);
    try {
      const backup = await api.createBackup(password);
      setSuccess(`Sauvegarde créée : ${backup.filename}`);
      setPassword("");
      loadBackups();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la sauvegarde.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(filename: string) {
    try {
      const data = await api.downloadBackup(filename);
      downloadJson(data, filename);
    } catch {
      setError("Échec du téléchargement de la sauvegarde.");
    }
  }

  return (
    <div>
      <form onSubmit={handleCreateBackup} className="vault-modal__backup-form">
        <div className="modal-field">
          <label>Mot de passe de sauvegarde (min. 12 car.)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Création..." : "💾 Créer une sauvegarde maintenant"}
        </button>
      </form>

      {error && <div className="modal-error">{error}</div>}
      {success && <div className="modal-success">{success}</div>}

      <p className="vault-modal__hint" style={{ marginTop: 16 }}>Sauvegardes existantes</p>
      {backups.length === 0 ? (
        <p className="vault-modal__empty">Aucune sauvegarde pour l'instant.</p>
      ) : (
        <ul className="vault-modal__backup-list">
          {backups.map((b) => (
            <li key={b.filename} className="vault-modal__backup-item">
              <div>
                <div className="vault-modal__backup-name">{b.filename}</div>
                <div className="vault-modal__backup-meta">
                  {new Date(b.created_at).toLocaleString("fr-FR")} · {(b.size_bytes / 1024).toFixed(1)} Ko
                </div>
              </div>
              <button type="button" className="btn-secondary" onClick={() => handleDownload(b.filename)}>
                Télécharger
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResetTab() {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.resetVault(masterPassword);
      window.location.reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Échec de la réinitialisation.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="vault-modal__danger-zone">
      <div className="vault-modal__danger-box">
        <h4>Réinitialisation complète de l'application</h4>
        <p className="vault-modal__hint">
          Cette action effacera définitivement l'intégralité de la base de données (identités, mots de passe, coffres). L'application retournera à l'état du tout premier démarrage.
        </p>
        <button
          type="button"
          className="btn-danger-bold"
          onClick={() => setShowConfirmModal(true)}
        >
          Réinitialiser totalement l'application
        </button>
      </div>

      {showConfirmModal && (
        <div className="danger-modal-backdrop">
          <div className="danger-modal-card">
            <h3>Confirmation de réinitialisation</h3>
            <p>
              Toutes vos données seront définitivement supprimées.
            </p>
            <p className="danger-modal-subtext">
              Veuillez saisir votre mot de passe maître actuel pour confirmer :
            </p>

            <form onSubmit={handleResetSubmit}>
              {error && <div className="modal-error">{error}</div>}

              <div className="modal-field">
                <input
                  type="password"
                  required
                  placeholder="Mot de passe maître actuel"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="danger-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setError(null);
                    setMasterPassword("");
                  }}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-danger-confirm" disabled={loading}>
                  {loading ? "Réinitialisation..." : "Confirmer la réinitialisation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}