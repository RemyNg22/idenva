import { useState } from "react";
import { UnlockPage } from "./pages/UnlockPage";
import { CanvasPage } from "./pages/CanvasPage";
import { SecurityDashboardPage } from "./pages/SecurityDashboardPage";

type View = "canvas" | "dashboard";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [view, setView] = useState<View>("canvas");

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