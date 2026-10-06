import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("export");

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-card--wide">
        <div className="vault-modal__tabs">
          <button className={tab === "export" ? "vault-modal__tab vault-modal__tab--active" : "vault-modal__tab"} onClick={() => setTab("export")}>
            {t("vaultDataModal.tabs.export")}
          </button>
          <button className={tab === "import" ? "vault-modal__tab vault-modal__tab--active" : "vault-modal__tab"} onClick={() => setTab("import")}>
            {t("vaultDataModal.tabs.import")}
          </button>
          <button className={tab === "backups" ? "vault-modal__tab vault-modal__tab--active" : "vault-modal__tab"} onClick={() => setTab("backups")}>
            {t("vaultDataModal.tabs.backups")}
          </button>
          <button className={tab === "reset" ? "vault-modal__tab vault-modal__tab--danger vault-modal__tab--active" : "vault-modal__tab vault-modal__tab--danger"} onClick={() => setTab("reset")}>
            {t("vaultDataModal.tabs.reset")}
          </button>
        </div>

        {tab === "export" && <ExportTab />}
        {tab === "import" && <ImportTab onImported={onImported} />}
        {tab === "backups" && <BackupsTab />}
        {tab === "reset" && <ResetTab />}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t("vaultDataModal.buttons.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportTab() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleExport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError(t("vaultDataModal.exportTab.errors.passwordLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("vaultDataModal.exportTab.errors.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const file = await api.exportVault(password);
      downloadJson(file, `idenva-export-${new Date().toISOString().slice(0, 10)}.json`);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("vaultDataModal.exportTab.errors.exportFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleExport}>
      <p className="vault-modal__hint">
        {t("vaultDataModal.exportTab.hintStart")}{" "}
        <strong>{t("vaultDataModal.exportTab.hintDifferent")}</strong>{" "}
        {t("vaultDataModal.exportTab.hintEnd")}
      </p>
      {error && <div className="modal-error">{error}</div>}
      {success && <div className="modal-success">{t("vaultDataModal.exportTab.success")}</div>}

      <div className="modal-field">
        <label>{t("vaultDataModal.exportTab.labels.password")}</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="modal-field">
        <label>{t("vaultDataModal.exportTab.labels.confirmPassword")}</label>
        <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? t("vaultDataModal.exportTab.buttons.exporting") : t("vaultDataModal.exportTab.buttons.submit")}
      </button>
    </form>
  );
}

function ImportTab({ onImported }: { onImported: () => void }) {
  const { t } = useTranslation();
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
      setError(t("vaultDataModal.importTab.errors.noFile"));
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
        setError(t("vaultDataModal.importTab.errors.invalidFile"));
      } else {
        setError(t("vaultDataModal.importTab.errors.importFailed"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleImport}>
      <p className="vault-modal__hint">{t("vaultDataModal.importTab.hint")}</p>
      {error && <div className="modal-error">{error}</div>}
      {summary && (
        <div className="modal-success">
          {t("vaultDataModal.importTab.success", {
            identities: summary.identities_imported,
            accounts: summary.accounts_imported,
            notes: summary.notes_imported,
            tasks: summary.tasks_imported,
          })}
        </div>
      )}

      <div className="modal-field">
        <label>{t("vaultDataModal.importTab.labels.file")}</label>
        <input type="file" accept="application/json" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="modal-field">
        <label>{t("vaultDataModal.importTab.labels.password")}</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? t("vaultDataModal.importTab.buttons.importing") : t("vaultDataModal.importTab.buttons.submit")}
      </button>
    </form>
  );
}

function BackupsTab() {
  const { t, i18n } = useTranslation();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function loadBackups() {
    api
      .listBackups()
      .then(setBackups)
      .catch(() => setError(t("vaultDataModal.backupsTab.errors.loadFailed")));
  }

  useEffect(loadBackups, []);

  async function handleCreateBackup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 12) {
      setError(t("vaultDataModal.backupsTab.errors.passwordLength"));
      return;
    }

    setLoading(true);
    try {
      const backup = await api.createBackup(password);
      setSuccess(t("vaultDataModal.backupsTab.success", { filename: backup.filename }));
      setPassword("");
      loadBackups();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("vaultDataModal.backupsTab.errors.createFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(filename: string) {
    try {
      const data = await api.downloadBackup(filename);
      downloadJson(data, filename);
    } catch {
      setError(t("vaultDataModal.backupsTab.errors.downloadFailed"));
    }
  }

  return (
    <div>
      <form onSubmit={handleCreateBackup} className="vault-modal__backup-form">
        <div className="modal-field">
          <label>{t("vaultDataModal.backupsTab.labels.password")}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading
            ? t("vaultDataModal.backupsTab.buttons.creating")
            : t("vaultDataModal.backupsTab.buttons.create")}
        </button>
      </form>

      {error && <div className="modal-error">{error}</div>}
      {success && <div className="modal-success">{success}</div>}

      <p className="vault-modal__hint" style={{ marginTop: 16 }}>
        {t("vaultDataModal.backupsTab.existingBackups")}
      </p>
      {backups.length === 0 ? (
        <p className="vault-modal__empty">{t("vaultDataModal.backupsTab.empty")}</p>
      ) : (
        <ul className="vault-modal__backup-list">
          {backups.map((b) => (
            <li key={b.filename} className="vault-modal__backup-item">
              <div>
                <div className="vault-modal__backup-name">{b.filename}</div>
                <div className="vault-modal__backup-meta">
                  {new Date(b.created_at).toLocaleString(i18n.language === "fr" ? "fr-FR" : "en-US")}{" "}
                  · {(b.size_bytes / 1024).toFixed(1)} {t("vaultDataModal.backupsTab.sizeUnit")}
                </div>
              </div>
              <button type="button" className="btn-secondary" onClick={() => handleDownload(b.filename)}>
                {t("vaultDataModal.backupsTab.buttons.download")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResetTab() {
  const { t } = useTranslation();
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
        setError(t("vaultDataModal.resetTab.errors.resetFailed"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="vault-modal__danger-zone">
      <div className="vault-modal__danger-box">
        <h4>{t("vaultDataModal.resetTab.title")}</h4>
        <p className="vault-modal__hint">{t("vaultDataModal.resetTab.warning")}</p>
        <button
          type="button"
          className="btn-danger-bold"
          onClick={() => setShowConfirmModal(true)}
        >
          {t("vaultDataModal.resetTab.buttons.openReset")}
        </button>
      </div>

      {showConfirmModal && (
        <div className="danger-modal-backdrop">
          <div className="danger-modal-card">
            <h3>{t("vaultDataModal.resetTab.modal.title")}</h3>
            <p>{t("vaultDataModal.resetTab.modal.description")}</p>
            <p className="danger-modal-subtext">{t("vaultDataModal.resetTab.modal.prompt")}</p>

            <form onSubmit={handleResetSubmit}>
              {error && <div className="modal-error">{error}</div>}

              <div className="modal-field">
                <input
                  type="password"
                  required
                  placeholder={t("vaultDataModal.resetTab.modal.placeholder")}
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
                  {t("vaultDataModal.resetTab.modal.buttons.cancel")}
                </button>
                <button type="submit" className="btn-danger-confirm" disabled={loading}>
                  {loading
                    ? t("vaultDataModal.resetTab.modal.buttons.resetting")
                    : t("vaultDataModal.resetTab.modal.buttons.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}