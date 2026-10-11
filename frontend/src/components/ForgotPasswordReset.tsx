import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../services/api";
import "./ForgotPasswordReset.css";

interface Props {
  onDone: () => void;
}

export function ForgotPasswordReset({ onDone }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const expected = t("forgotReset.confirmWord", { defaultValue: "SUPPRIMER" });
  const valid = word.trim().toUpperCase() === expected.toUpperCase();

  async function confirm() {
    setError(null);
    setLoading(true);
    try {
      await api.forgotReset(word);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("unlockPage.errors.connectionError"));
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="forgot__link" onClick={() => setOpen(true)}>
        {t("forgotReset.link", { defaultValue: "Mot de passe oublié ?" })}
      </button>
    );
  }

  return (
    <div className="forgot__panel" role="alertdialog" aria-live="polite">
      <p className="forgot__warning">
        {t("forgotReset.warning", {
          defaultValue:
            "Aucune récupération n'est possible. Tout le contenu du coffre (identités, comptes, notes, tâches) sera supprimé définitivement et vous repartirez de zéro.",
        })}
      </p>
      <label className="forgot__label" htmlFor="forgot-confirm">
        {t("forgotReset.typePrompt", { defaultValue: "Tapez {{word}} pour confirmer", word: expected })}
      </label>
      <input
        id="forgot-confirm"
        className="forgot__input"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        autoComplete="off"
      />
      {error && <p className="forgot__error">{error}</p>}
      <div className="forgot__actions">
        <button type="button" className="forgot__cancel" onClick={() => { setOpen(false); setWord(""); setError(null); }}>
          {t("forgotReset.cancel", { defaultValue: "Annuler" })}
        </button>
        <button type="button" className="forgot__danger" disabled={!valid || loading} onClick={confirm}>
          {loading ? "..." : t("forgotReset.confirm", { defaultValue: "Tout supprimer" })}
        </button>
      </div>
    </div>
  );
}