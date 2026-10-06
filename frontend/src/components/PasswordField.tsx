import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../services/api";
import "./PasswordField.css";

interface NewPasswordFieldProps {
  mode: "new";
  value: string;
  onChange: (value: string) => void;
}

interface RevealPasswordFieldProps {
  mode: "reveal";
  accountId: string;
  secretType: "password" | "totp";
  hasSecret: boolean;
}

type PasswordFieldProps = NewPasswordFieldProps | RevealPasswordFieldProps;

const REVEAL_HIDE_DELAY_MS = 15_000;

export function PasswordField(props: PasswordFieldProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (props.mode !== "new") return;
    try {
      const { password } = await api.generatePassword({ length: 24 });
      props.onChange(password);
    } catch {
      setError(t("passwordField.errors.generateFailed"));
    }
  }

  async function handleReveal() {
    if (props.mode !== "reveal") return;
    setLoading(true);
    setError(null);
    try {
      const result =
        props.secretType === "password"
          ? await api.revealPassword(props.accountId)
          : await api.revealTotp(props.accountId);
      setRevealed(result.value);
      setTimeout(() => setRevealed(null), REVEAL_HIDE_DELAY_MS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("passwordField.errors.revealFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (props.mode !== "reveal") return;
    try {
      const result =
        props.secretType === "password"
          ? await api.revealPassword(props.accountId)
          : await api.revealTotp(props.accountId);
      await navigator.clipboard.writeText(result.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("passwordField.errors.copyFailed"));
    }
  }

  if (props.mode === "new") {
    return (
      <div className="password-field">
        <input
          type="text"
          className="password-field__input"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={t("passwordField.placeholders.newPassword")}
        />
        <button type="button" className="password-field__btn" onClick={handleGenerate}>
          {t("passwordField.buttons.generate")}
        </button>
        {error && <p className="password-field__error">{error}</p>}
      </div>
    );
  }

  if (!props.hasSecret) {
    return (
      <p className="password-field__empty">
        {props.secretType === "totp"
          ? t("passwordField.emptyTotp")
          : t("passwordField.emptyPassword")}
      </p>
    );
  }

  return (
    <div className="password-field">
      <div className="password-field__display">
        {revealed ?? "•".repeat(16)}
      </div>
      <button
        type="button"
        className="password-field__btn"
        onClick={revealed ? () => setRevealed(null) : handleReveal}
        disabled={loading}
      >
        {revealed ? t("passwordField.buttons.hide") : t("passwordField.buttons.show")}
      </button>
      <button type="button" className="password-field__btn" onClick={handleCopy}>
        {copied ? t("passwordField.buttons.copied") : t("passwordField.buttons.copy")}
      </button>
      {error && <p className="password-field__error">{error}</p>}
    </div>
  );
}