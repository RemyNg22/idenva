import { useTranslation } from "react-i18next";
import { triggerOnboarding } from "./OnboardingModal";
import "./HelpButton.css";

export function HelpButton() {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="help-floating-btn"
      onClick={triggerOnboarding}
      title={t("helpButton.title")}
      style={{ position: "static" }}
    >
      ❓ {t("helpButton.label")}
    </button>
  );
}