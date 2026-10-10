import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, SquareCheck, Shield, HardDrive, KeyRound, Lock } from "lucide-react";
import "./OnboardingModal.css";

const STORAGE_KEY = "idenva_onboarding_completed";
const stepIcons = [Lock, Search, KeyRound, Shield, SquareCheck, HardDrive];

export function OnboardingModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem(STORAGE_KEY);
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
      title: t("onboarding.steps.0.title"),
      content: t("onboarding.steps.0.content"),
    },
    {
      title: t("onboarding.steps.1.title"),
      content: t("onboarding.steps.1.content"),
    },
    {
      title: t("onboarding.steps.2.title"),
      content: t("onboarding.steps.2.content"),
    },
    {
      title: t("onboarding.steps.3.title"),
      content: t("onboarding.steps.3.content"),
    },
    {
      title: t("onboarding.steps.4.title"),
      content: t("onboarding.steps.4.content"),
    },
    {
      title: t("onboarding.steps.5.title"),
      content: t("onboarding.steps.5.content"),
    },
  ];

  if (!isOpen) return null;


  const CurrentIcon = stepIcons[currentStep] || Shield;

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-card">
        <div className="onboarding-icon-container">
          <CurrentIcon className="onboarding-step-icon" size={28} />
        </div>

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
            {t("onboarding.buttons.skip")}
          </button>

          <div className="onboarding-nav">
            {currentStep > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCurrentStep((prev) => prev - 1)}
              >
                {t("onboarding.buttons.previous")}
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCurrentStep((prev) => prev + 1)}
              >
                {t("onboarding.buttons.next")}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={handleClosePermanently}>
                {t("onboarding.buttons.finish")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function triggerOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("open-onboarding"));
}