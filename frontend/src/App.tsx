import { useState, useEffect } from "react";
import { UnlockPage } from "./pages/UnlockPage";
import { CanvasPage } from "./pages/CanvasPage";
import { SecurityDashboardPage } from "./pages/SecurityDashboardPage";
import { OnboardingModal } from "./components/OnboardingModal";
import { HelpButton } from "./components/HelpButton";

type View = "canvas" | "dashboard";

export default function App() {
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
        <h2>Lancement d'Idenva...</h2>
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>Connexion au serveur en cours</p>
      </div>
    );
  }

  if (!unlocked) {
    return <UnlockPage onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <>
      {/* La modale s'affichera au-dessus de l'application si non masquée */}
      <OnboardingModal />

      {/* Le bouton d'aide flottant en bas à droite */}
      <HelpButton />

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