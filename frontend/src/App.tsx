import { useState } from "react";
import { UnlockPage } from "./pages/UnlockPage";

export default function App() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <UnlockPage onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div style={{ color: "#e8e9ed", padding: 24 }}>
      Vault déverrouillé - le reste arrive un peu plus tard.
    </div>
  );
}