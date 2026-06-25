import { DEFAULT_CONFIG, ledgerTotalsFromHistory } from "../../src/mineLogic.ts";
import { normalizeLedgerHistory } from "../../src/types.ts";

export function normalizeSavedLedger(raw: Record<string, unknown>): Record<string, unknown> {
  const history = normalizeLedgerHistory((raw.history as unknown[]) ?? []);
  const guardCount =
    typeof raw.guardCount === "number" ? raw.guardCount : DEFAULT_CONFIG.guardCount;
  const startingTreasury =
    typeof raw.startingTreasury === "number"
      ? raw.startingTreasury
      : DEFAULT_CONFIG.startingTreasuryGp;
  const startupPaid = Boolean(raw.startupPaid);
  const config = { ...DEFAULT_CONFIG, guardCount, startingTreasuryGp: startingTreasury };
  const { treasuryGp, week } = ledgerTotalsFromHistory(
    history,
    config,
    startingTreasury,
    startupPaid,
  );

  return {
    ...raw,
    history,
    treasuryGp,
    week,
    guardCount,
    startingTreasury,
    startupPaid,
  };
}
