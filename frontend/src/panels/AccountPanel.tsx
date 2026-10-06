import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  api, 
  ApiError, 
  type Account, 
  type Credential, 
  type EmailEntity, 
  type Phone, 
  type Domain 
} from "../services/api";
import { PasswordField } from "../components/PasswordField";
import { NotesSection } from "../components/NotesSection";
import { TasksSection } from "../components/TasksSection";
import "./Panel.css";

interface AccountPanelProps {
  account: Account;
  onClose: () => void;
  onAccountUpdated: (account: Account) => void;
  onAccountDeleted: (accountId: string) => void;
}

export function AccountPanel({ account, onClose, onAccountUpdated, onAccountDeleted }: AccountPanelProps) {
  const { t, i18n } = useTranslation();
  const [serviceName, setServiceName] = useState(account.service_name);
  const [username, setUsername] = useState(account.username ?? "");
  const [url, setUrl] = useState(account.url ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Credentials ---
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credLabel, setCredLabel] = useState("");
  const [credType, setCredType] = useState("api_key");
  const [credSecret, setCredSecret] = useState("");
  const [revealedSecrets, setRevealedSecrets] = useState<{ [key: string]: string }>({});

  // --- Emails, Phones, Domains ---
  const [emails, setEmails] = useState<EmailEntity[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [phones, setPhones] = useState<Phone[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState("");

  useEffect(() => {
    loadAllRelatedData();
  }, [account.id, account.identity_id]);

  async function loadAllRelatedData() {
    try {
      const credsData = await api.listCredentials("account", account.id);
      setCredentials(credsData);

      if (account.identity_id) {
        const [emailsData, phonesData, domainsData] = await Promise.all([
          api.listEmails(account.identity_id),
          api.listPhones(account.identity_id),
          api.listDomains(account.identity_id),
        ]);
        setEmails(emailsData);
        setPhones(phonesData);
        setDomains(domainsData);
      }
    } catch (err) {
      console.error("Erreur chargement données rattachées:", err);
    }
  }

  // --- Handlers Credentials ---
  async function handleAddCredential() {
    if (!credLabel || !credSecret) return;
    try {
      await api.createCredential("account", account.id, credLabel, credType, credSecret);
      setCredLabel("");
      setCredSecret("");
      loadAllRelatedData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("accountPanel.errors.addCredential"));
    }
  }

  async function handleToggleCredentialSecret(id: string) {
    if (revealedSecrets[id]) {
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    try {
      const res = await api.revealCredential(id);
      setRevealedSecrets((prev) => ({ ...prev, [id]: res.value }));
    } catch {
      setError(t("accountPanel.errors.revealSecret"));
    }
  }

  async function handleDeleteCredential(id: string) {
    try {
      await api.deleteCredential(id);
      loadAllRelatedData();
    } catch {
      setError(t("accountPanel.errors.deleteCredential"));
    }
  }

  // --- Handlers Emails, Phones, Domains ---
  async function handleAddEmail() {
    if (!newEmail || !account.identity_id) return;
    try {
      await api.createEmail(account.identity_id, newEmail);
      setNewEmail("");
      loadAllRelatedData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("accountPanel.errors.addEmail"));
    }
  }

  async function handleDeleteEmail(id: string) {
    try {
      await api.deleteEmail(id);
      loadAllRelatedData();
    } catch {
      setError(t("accountPanel.errors.deleteEmail"));
    }
  }

  async function handleAddPhone() {
    if (!newPhone || !account.identity_id) return;
    try {
      await api.createPhone(account.identity_id, newPhone);
      setNewPhone("");
      loadAllRelatedData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("accountPanel.errors.addPhone"));
    }
  }

  async function handleDeletePhone(id: string) {
    try {
      await api.deletePhone(id);
      loadAllRelatedData();
    } catch {
      setError(t("accountPanel.errors.deletePhone"));
    }
  }

  async function handleAddDomain() {
    if (!newDomain || !account.identity_id) return;
    try {
      await api.createDomain(account.identity_id, newDomain);
      setNewDomain("");
      loadAllRelatedData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("accountPanel.errors.addDomain"));
    }
  }

  async function handleDeleteDomain(id: string) {
    try {
      await api.deleteDomain(id);
      loadAllRelatedData();
    } catch {
      setError(t("accountPanel.errors.deleteDomain"));
    }
  }

  // --- Account Updates ---
  async function handleSaveDetails() {
    try {
      const updated = await api.updateAccount(account.id, {
        service_name: serviceName,
        username: username || undefined,
        url: url || undefined,
      });
      onAccountUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("accountPanel.errors.saveDetails"));
    }
  }

  async function handleSetPassword() {
    if (!newPassword) return;
    try {
      const updated = await api.updateAccount(account.id, { password: newPassword });
      onAccountUpdated(updated);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("accountPanel.errors.updatePassword"));
    }
  }

  async function handleToggle2fa() {
    try {
      const updated = await api.updateAccount(account.id, { has_2fa: !account.has_2fa });
      onAccountUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("accountPanel.errors.update2fa"));
    }
  }

  async function handleDelete() {
    try {
      await api.deleteAccount(account.id);
      onAccountDeleted(account.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("accountPanel.errors.deleteAccount"));
    }
  }

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__type">{t("accountPanel.type")}</span>
        <button className="panel__close" onClick={onClose}>×</button>
      </div>

      <label className="panel__label">{t("accountPanel.labels.service")}</label>
      <input className="panel__input" value={serviceName} onChange={(e) => setServiceName(e.target.value)} onBlur={handleSaveDetails} />

      <label className="panel__label">{t("accountPanel.labels.username")}</label>
      <input className="panel__input" value={username} onChange={(e) => setUsername(e.target.value)} onBlur={handleSaveDetails} />

      <label className="panel__label">{t("accountPanel.labels.url")}</label>
      <input className="panel__input" value={url} onChange={(e) => setUrl(e.target.value)} onBlur={handleSaveDetails} />

      <label className="panel__label">{t("accountPanel.labels.mainPassword")}</label>
      <PasswordField mode="reveal" accountId={account.id} secretType="password" hasSecret={account.has_password} />

      <label className="panel__label panel__label--spaced">{t("accountPanel.labels.changePassword")}</label>
      <PasswordField mode="new" value={newPassword} onChange={setNewPassword} />
      {newPassword && (
        <button className="panel__btn" onClick={handleSetPassword} style={{ marginTop: 8 }}>
          {t("accountPanel.buttons.saveNewPassword")}
        </button>
      )}

      <label className="panel__label panel__label--spaced">
        <input type="checkbox" checked={account.has_2fa} onChange={handleToggle2fa} /> {t("accountPanel.labels.has2fa")}
      </label>

      {/* --- Section Credentials --- */}
      <h3 className="panel__section-title">{t("accountPanel.sections.credentials")}</h3>
      <ul className="panel__account-list">
        {credentials.map((cred) => (
          <li key={cred.id} className="panel__account-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <span><strong>{cred.label}</strong> ({cred.secret_type})</span>
              <button className="panel__btn panel__btn--danger" style={{ padding: "2px 6px" }} onClick={() => handleDeleteCredential(cred.id)}>×</button>
            </div>
            {revealedSecrets[cred.id] && (
              <code style={{ fontSize: 11, background: "#14161c", padding: "4px 8px", width: "100%", marginTop: 4, borderRadius: 4, wordBreak: "break-all" }}>
                {revealedSecrets[cred.id]}
              </code>
            )}
            <button className="panel__btn" style={{ fontSize: 11, marginTop: 4 }} onClick={() => handleToggleCredentialSecret(cred.id)}>
              {revealedSecrets[cred.id] ? t("accountPanel.buttons.hideKey") : t("accountPanel.buttons.revealKey")}
            </button>
          </li>
        ))}
      </ul>

      <div className="panel__add-form">
        <input className="panel__input" placeholder={t("accountPanel.placeholders.credLabel")} value={credLabel} onChange={(e) => setCredLabel(e.target.value)} />
        <select className="panel__input" value={credType} onChange={(e) => setCredType(e.target.value)}>
          <option value="api_key">{t("accountPanel.credTypes.apiKey")}</option>
          <option value="ssh_key">{t("accountPanel.credTypes.sshKey")}</option>
          <option value="token">{t("accountPanel.credTypes.token")}</option>
          <option value="other">{t("accountPanel.credTypes.other")}</option>
        </select>
        <input className="panel__input" placeholder={t("accountPanel.placeholders.credSecret")} value={credSecret} onChange={(e) => setCredSecret(e.target.value)} />
        <button className="panel__btn" onClick={handleAddCredential}>{t("accountPanel.buttons.addCredential")}</button>
      </div>

      {/* --- Section Emails --- */}
      <h3 className="panel__section-title">{t("accountPanel.sections.emails")}</h3>
      <ul className="panel__account-list">
        {emails.map((email) => (
          <li key={email.id} className="panel__account-item">
            <span>{email.address}</span>
            <button className="panel__btn panel__btn--danger" style={{ padding: "2px 6px" }} onClick={() => handleDeleteEmail(email.id)}>×</button>
          </li>
        ))}
      </ul>
      <div className="panel__add-form" style={{ display: "flex", gap: 8 }}>
        <input className="panel__input" placeholder={t("accountPanel.placeholders.email")} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        <button className="panel__btn" onClick={handleAddEmail}>{t("accountPanel.buttons.addEmail")}</button>
      </div>

      {/* --- Section Téléphones --- */}
      <h3 className="panel__section-title">{t("accountPanel.sections.phones")}</h3>
      <ul className="panel__account-list">
        {phones.map((phone) => (
          <li key={phone.id} className="panel__account-item">
            <span>{phone.number}</span>
            <button className="panel__btn panel__btn--danger" style={{ padding: "2px 6px" }} onClick={() => handleDeletePhone(phone.id)}>×</button>
          </li>
        ))}
      </ul>
      <div className="panel__add-form" style={{ display: "flex", gap: 8 }}>
        <input className="panel__input" placeholder={t("accountPanel.placeholders.phone")} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        <button className="panel__btn" onClick={handleAddPhone}>{t("accountPanel.buttons.addPhone")}</button>
      </div>

      {/* --- Section Domaines --- */}
      <h3 className="panel__section-title">{t("accountPanel.sections.domains")}</h3>
      <ul className="panel__account-list">
        {domains.map((domain) => (
          <li key={domain.id} className="panel__account-item">
            <span>{domain.domain_name}</span>
            <button className="panel__btn panel__btn--danger" style={{ padding: "2px 6px" }} onClick={() => handleDeleteDomain(domain.id)}>×</button>
          </li>
        ))}
      </ul>
      <div className="panel__add-form" style={{ display: "flex", gap: 8 }}>
        <input className="panel__input" placeholder={t("accountPanel.placeholders.domain")} value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
        <button className="panel__btn" onClick={handleAddDomain}>{t("accountPanel.buttons.addDomain")}</button>
      </div>

      {account.last_password_change && (
        <p className="panel__meta">
          {t("accountPanel.lastPasswordChange", {
            date: new Date(account.last_password_change).toLocaleDateString(i18n.language === "en" ? "en-US" : "fr-FR")
          })}
        </p>
      )}

      <NotesSection ownerId={account.id} ownerType="account" />
      <TasksSection relatedId={account.id} relatedType="account" />

      {error && <p className="panel__error">{error}</p>}

      <div className="panel__danger-zone">
        {!showDeleteConfirm ? (
          <button className="panel__btn panel__btn--danger" onClick={() => setShowDeleteConfirm(true)}>
            {t("accountPanel.buttons.deleteAccount")}
          </button>
        ) : (
          <div className="panel__confirm">
            <p>{t("accountPanel.confirmDelete", { serviceName: account.service_name })}</p>
            <div className="panel__confirm-actions">
              <button className="panel__btn panel__btn--danger" onClick={handleDelete}>{t("common.confirm")}</button>
              <button className="panel__btn" onClick={() => setShowDeleteConfirm(false)}>{t("common.cancel")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}