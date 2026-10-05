import { useState, useEffect } from "react";
import "./OnboardingModal.css";

const STORAGE_KEY = "idenva_onboarding_completed";

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

useEffect(() => {
  const hasSeenGuide = localStorage.getItem("idenva_onboarding_completed");
  if (!hasSeenGuide) {
    setIsOpen(true);
  }

  const handleOpen = () => setIsOpen(true);
  window.addEventListener("open-onboarding", handleOpen);

  return () => window.removeEventListener("open-onboarding", handleOpen);
}, []);

  function handleClosePermanently() {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  }

  const steps = [
    {
      title: "Bienvenue sur Idenva ! 👋",
      content:
        "Votre coffre-fort numérique sécurisé pour organiser et visualiser l'ensemble de vos données confidentielles, comptes et identités.",
    },
    {
      title: "1. Créez vos identités 👤",
      content:
        "Commencez par cliquer sur le bouton « + Identité » en haut à gauche en donnant un nom à cette identité. À partir de chaque identité, vous pourrez lui rattacher directement des comptes, des notes et des tâches.",
    },
    {
      title: "2. Complétez vos comptes 🔑",
      content:
        "Pour chaque compte, ajoutez un nom d'utilisateur, gérez et générez des mots de passe forts, renseignez des clés API, emails, numéros de téléphone, domaines, ainsi que des notes et tâches dédiées.",
    },
    {
      title: "3. Outils & Navigation 🛠️",
      content:
        "Utilisez 🔍 Rechercher pour trouver rapidement un compte, 🔑 Mot de passe pour modifier votre mot de passe maître, et 🛡️ Sécurité pour contrôler la robustesse de vos accès.",
    },
    {
      title: "4. Notes & Tâches 📋",
      content:
        "Un bouton dédié aux Notes & Tâches vous permet d'ouvrir un panneau récapitulatif pour consulter et gérer toutes vos notes et tâches associées à chaque identité ou compte au même endroit.",
    },
    {
      title: "5. Données & Sécurité 💾",
      content:
        "Le bouton « 💾 Données » vous donne un accès centralisé pour créer des sauvegardes de sécurité, importer des exports et effectuer la réinitialisation de l'application.",
    },
  ];


  if (!isOpen) return null;

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-card">
        <h3>{steps[currentStep].title}</h3>
        <p>{steps[currentStep].content}</p>

        <div className="onboarding-dots">
          {steps.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentStep ? "active" : ""}`}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          <button type="button" className="btn-skip" onClick={handleClosePermanently}>
            Ne plus me rappeler
          </button>

          <div className="onboarding-nav">
            {currentStep > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                Précédent
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCurrentStep((prev) => prev + 1)}
              >
                Suivant
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={handleClosePermanently}>
                Terminer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function triggerOnboarding() {
  localStorage.removeItem("idenva_onboarding_completed");
  window.dispatchEvent(new Event("open-onboarding"));
}