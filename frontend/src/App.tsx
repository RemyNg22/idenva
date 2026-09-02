import { useState } from "react";
import { UnlockPage } from "./pages/UnlockPage";
import { CanvasPage } from "./pages/CanvasPage";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <UnlockPage onUnlocked={() => setUnlocked(true)} />;
  }

  return <CanvasPage onLock={() => setUnlocked(false)} />;
}