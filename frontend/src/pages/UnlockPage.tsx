import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type VaultStatus } from "../services/api";
import "./UnlockPage.css";

interface UnlockPageProps {
  onUnlocked: () => void;
}

export function UnlockPage({ onUnlocked }: UnlockPageProps) {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getStatus().then(setStatus).catch(() => setError("Impossible de joindre le serveur Idenva."));
  }, []);

  const isFirstRun = status?.vault_exists === false;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (isFirstRun && password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
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
      setError(err instanceof ApiError ? err.message : "Erreur de connexion au serveur.");
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

      <div className="unlock-card">
        <div className="unlock-card__mark">
          <img src="/favicon.svg" alt="Idenva Logo" width={32} height={32} />
        </div>
        <h1 className="unlock-card__title">Idenva</h1>
        <p className="unlock-card__subtitle">
          {isFirstRun ? "Crée ton mot de passe principal" : "Déverrouille ton coffre"}
        </p>

        <form onSubmit={handleSubmit} className="unlock-form">
          <label className="unlock-form__label" htmlFor="master-password">
            Mot de passe maître
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
                Confirmer le mot de passe
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
            {loading ? "..." : isFirstRun ? "Créer le coffre-fort" : "Déverrouiller"}
          </button>
        </form>

        {isFirstRun && (
          <p className="unlock-card__footnote">
            Ce mot de passe ne peut pas être récupéré s'il est perdu.
          </p>
        )}
      </div>
    </div>
  );
}