import { triggerOnboarding } from "./OnboardingModal";
import "./HelpButton.css";

export function HelpButton() {
  return (
    <button
      type="button"
      className="help-floating-btn"
      onClick={triggerOnboarding}
      title="Revoir le guide d'utilisation"
    >
      ❓ Aide
    </button>
  );
}