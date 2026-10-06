import { useTranslation } from "react-i18next";
import "./LanguageSwitcher.css";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("en") ? "en" : "fr";

  const toggleLanguage = () => {
    const nextLang = currentLang === "fr" ? "en" : "fr";
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      type="button"
      className="language-switcher-compact"
      onClick={toggleLanguage}
      title="Changer la langue / Change language"
    >
      <span className={currentLang === "fr" ? "active" : ""}>FR</span>
      <span className="separator">/</span>
      <span className={currentLang === "en" ? "active" : ""}>EN</span>
    </button>
  );
}