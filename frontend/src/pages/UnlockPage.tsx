import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, type VaultStatus } from "../services/api";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import "./UnlockPage.css";

interface UnlockPageProps {
  onUnlocked: () => void;
}

export function UnlockPage({ onUnlocked }: UnlockPageProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .getStatus()
      .then(setStatus)
      .catch(() => setError(t("unlockPage.errors.serverUnreachable")));
  }, [t]);

  const isFirstRun = status?.vault_exists === false;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (isFirstRun && password !== confirmPassword) {
      setError(t("unlockPage.errors.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      if (isFirstRun) {
        await api.setupVault(password);
      } else {
        await api.unlockVault(password);
      }
      onUnlocked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("unlockPage.errors.connectionError"));
    } finally {
      setLoading(false);
    }
  }

  if (status === null && !error) {
    return <div className="unlock-page" />;
  }

  return (
    <div className="unlock-page">
      <div className="unlock-page__grid" aria-hidden="true" />

      {/* Switcher discret positionné en haut à droite */}
      <div className="unlock-page__lang-switcher">
        <LanguageSwitcher />
      </div>

      <div className="unlock-card">
        <div className="unlock-card__mark">
          <img src="/favicon.svg" alt="Idenva Logo" width={32} height={32} />
        </div>
        <h1 className="unlock-card__title">Idenva</h1>
        <p className="unlock-card__subtitle">
          {isFirstRun ? t("unlockPage.subtitleFirstRun") : t("unlockPage.subtitleUnlock")}
        </p>

        <form onSubmit={handleSubmit} className="unlock-form">
          <label className="unlock-form__label" htmlFor="master-password">
            {t("unlockPage.masterPasswordLabel")}
          </label>
          <input
            id="master-password"
            type="password"
            className="unlock-form__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            minLength={isFirstRun ? 12 : undefined}
          />

          {isFirstRun && (
            <>
              <label className="unlock-form__label" htmlFor="confirm-password">
                {t("unlockPage.confirmPasswordLabel")}
              </label>
              <input
                id="confirm-password"
                type="password"
                className="unlock-form__input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </>
          )}

          {error && <p className="unlock-form__error">{error}</p>}

          <button type="submit" className="unlock-form__submit" disabled={loading}>
            {loading ? "..." : isFirstRun ? t("unlockPage.buttons.createVault") : t("unlockPage.buttons.unlock")}
          </button>
        </form>

        {isFirstRun && (
          <p className="unlock-card__footnote">
            {t("unlockPage.footnote")}
          </p>
        )}
      </div>
    </div>
  );
}