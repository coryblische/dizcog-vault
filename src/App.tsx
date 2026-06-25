import { useCallback, useEffect, useState } from "react";
import { ArcaneBackdrop } from "./arcane-ui";
import { checkAuth, loadLedger, logout, saveLedger } from "./api";
import LoginGate from "./LoginGate";
import LedgerApp from "./LedgerApp";
import MoonTracker from "./MoonTracker";

type VaultPage = "ledger" | "moon";

export default function App() {
  const [authState, setAuthState] = useState<"loading" | "locked" | "unlocked">("loading");
  const [page, setPage] = useState<VaultPage>("ledger");

  useEffect(() => {
    checkAuth().then((ok) => setAuthState(ok ? "unlocked" : "locked"));
  }, []);

  const handleUnlock = useCallback(() => setAuthState("unlocked"), []);

  const handleLogout = useCallback(async () => {
    await logout();
    setAuthState("locked");
  }, []);

  if (authState === "loading") {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <ArcaneBackdrop />
        <p className="relative z-10 font-display tracking-widest text-arcane-light uppercase animate-arcane-pulse">
          Attuning vault…
        </p>
      </div>
    );
  }

  if (authState === "locked") {
    return <LoginGate onSuccess={handleUnlock} />;
  }

  if (page === "moon") {
    return <MoonTracker onBack={() => setPage("ledger")} onLogout={handleLogout} />;
  }

  return (
    <LedgerApp
      onLogout={handleLogout}
      onOpenMoonTracker={() => setPage("moon")}
      loadLedger={loadLedger}
      saveLedger={saveLedger}
    />
  );
}
