import {
  DEFAULT_CONFIG,
  ledgerTotalsFromHistory,
  resolveOperatingCosts,
  sumOperatingCostLines,
} from "../../src/mineLogic.ts";
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
  const operatingCosts = resolveOperatingCosts({
    startupCostLines: raw.startupCostLines,
    weeklyCostLines: raw.weeklyCostLines,
    guardCount,
  });
  const startupCostGp = sumOperatingCostLines(operatingCosts.startup);
  const { treasuryGp, week } = ledgerTotalsFromHistory(
    history,
    startingTreasury,
    startupPaid,
    startupCostGp,
  );

  return {
    ...raw,
    history,
    treasuryGp,
    week,
    guardCount,
    startingTreasury,
    startupPaid,
    startupCostLines: operatingCosts.startup,
    weeklyCostLines: operatingCosts.weekly,
  };
}
