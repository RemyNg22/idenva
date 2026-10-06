import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { UnlockPage } from "./pages/UnlockPage";
import { CanvasPage } from "./pages/CanvasPage";
import { SecurityDashboardPage } from "./pages/SecurityDashboardPage";
import { OnboardingModal } from "./components/OnboardingModal";
import { HelpButton } from "./components/HelpButton";
import { LanguageSwitcher } from "./components/LanguageSwitcher";

type View = "canvas" | "dashboard";

export default function App() {
  const { t } = useTranslation();
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [view, setView] = useState<View>("canvas");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let retries = 0;
    const maxRetries = 30;

    const checkHealth = async () => {
      try {
        const res = await fetch("/health", { cache: "no-store" });
        if (res.ok) {
          setIsBackendReady(true);
          return;
        }
      } catch {
        // En attente du démarrage de FastAPI
      }

      if (retries < maxRetries) {
        retries++;
        timer = setTimeout(checkHealth, 500);
      }
    };

    checkHealth();

    return () => clearTimeout(timer);
  }, []);

  if (!isBackendReady) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        fontFamily: "system-ui, sans-serif"
      }}>
        <h2>{t("app.loadingTitle")}</h2>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>{t("app.loadingSubtitle")}</p>
      </div>
    );
  }

  if (!unlocked) {
    return <UnlockPage onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <>
    
      <OnboardingModal />

      {/* Zone d'outils flottante fixe en bas à droite */}
      <div style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        zIndex: 9999
      }}>
        <LanguageSwitcher />
        <HelpButton />
      </div>

      {view === "dashboard" ? (
        <SecurityDashboardPage onClose={() => setView("canvas")} />
      ) : (
        <CanvasPage
          onLock={() => setUnlocked(false)}
          onOpenDashboard={() => setView("dashboard")}
        />
      )}
    </>
  );
}