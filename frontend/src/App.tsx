import { useState, useEffect } from "react";
import { UnlockPage } from "./pages/UnlockPage";
import { CanvasPage } from "./pages/CanvasPage";
import { SecurityDashboardPage } from "./pages/SecurityDashboardPage";

type View = "canvas" | "dashboard";

export default function App() {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [view, setView] = useState<View>("canvas");

  useEffect(() => {
    let retries = 0;
    const maxRetries = 15; // 15 secondes max

    const checkHealth = async () => {
      try {
        const res = await fetch("/health");
        if (res.ok) {
          setIsBackendReady(true);
          return;
        }
      } catch {
      }

      if (retries < maxRetries) {
        retries++;
        setTimeout(checkHealth, 1000);
      }
    };

    checkHealth();
  }, []);

  if (!isBackendReady) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        fontFamily: "sans-serif"
      }}>
        <p>Lancement d'Idenva en cours...</p>
      </div>
    );
  }

  if (!unlocked) {
    return <UnlockPage onUnlocked={() => setUnlocked(true)} />;
  }

  if (view === "dashboard") {
    return <SecurityDashboardPage onClose={() => setView("canvas")} />;
  }

  return (
    <CanvasPage
      onLock={() => setUnlocked(false)}
      onOpenDashboard={() => setView("dashboard")}
    />
  );
}