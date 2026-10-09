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
    let isSubscribed = true;
    let retries = 0;
    const maxRetries = 60;

    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        const res = await fetch("http://127.0.0.1:18492/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok && isSubscribed) {
          setIsBackendReady(true);
          return;
        }
      } catch {
      }

      if (retries < maxRetries && isSubscribed) {
        retries++;
        timer = setTimeout(checkHealth, 300);
      }
    };

    timer = setTimeout(checkHealth, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
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
        left: "70px",
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