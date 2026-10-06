import { useTranslation } from "react-i18next";
import { triggerOnboarding } from "./OnboardingModal";
import { LanguageSwitcher } from "./LanguageSwitcher";
import "./HelpButton.css";

export function HelpButton() {
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        zIndex: 9999,
      }}
    >
      <LanguageSwitcher />
      <button
        type="button"
        className="help-floating-btn"
        onClick={triggerOnboarding}
        title={t("helpButton.title")}
        style={{ position: "static" }}
      >
        ❓ {t("helpButton.label")}
      </button>
    </div>
  );
}