import gameContent from "../content/game.json";
import type { LedgerEntry, MineConfig, RollOutcome, WeekLedgerEntry } from "./types";
import { isWeekEntry } from "./types";

export const ROLL_OUTCOMES: RollOutcome[] = gameContent.rollOutcomes as RollOutcome[];

export const DEFAULT_CONFIG: MineConfig = gameContent.defaultConfig as MineConfig;

export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function getOutcome(roll: number): RollOutcome {
  return ROLL_OUTCOMES[roll - 1];
}

export function calcStartupCost(config: MineConfig): number {
  return (
    config.miningToolsGp +
    config.lanternOilInitialGp +
    config.foodInitialGp +
    config.animalsGp +
    config.cartsGp
  );
}

export function calcWeeklyOperatingCost(config: MineConfig): number {
  const days = config.daysPerWeek;
  const delgado = config.delgadoGpPerDay * days;
  const miners = config.minerSpPerDay * config.minerCount * days * 0.1;
  const guards = config.guardGpPerDay * config.guardCount * days;
  const cook = config.cookGpPerDay * days;
  const bookkeeper = config.bookkeeperGpPerDay * days;
  const lanternOil = (config.lanternOilMonthlyGp / 30) * days;
  const food = (config.foodMonthlyGp / 30) * days;

  return delgado + miners + guards + cook + bookkeeper + lanternOil + food;
}

export function calcMonthlyOperatingCost(config: MineConfig): number {
  const weeksPerMonth = 30 / config.daysPerWeek;
  return calcWeeklyOperatingCost(config) * weeksPerMonth;
}

export function resolveProfit(
  outcome: RollOutcome,
  rollD6Fn: () => number = rollD6,
): { profitGp: number; detail: string } {
  if (outcome.roll === 1) {
    const loss = 50 + rollD6Fn() * 25;
    return {
      profitGp: -loss,
      detail: `Cave-in! Equipment damage & rescue costs: ${loss} gp lost`,
    };
  }

  if (outcome.roll === 5) {
    const bonus = rollD6Fn() * 50;
    const profit = 300 + bonus;
    return {
      profitGp: profit,
      detail: `Exceptional haul: 300 gp + ${bonus} gp bonus = ${profit} gp`,
    };
  }

  if (outcome.roll === 6) {
    const veinRoll = rollD6Fn();
    if (veinRoll <= 2) {
      const profit = 400 + rollD6Fn() * 100;
      return {
        profitGp: profit,
        detail: `Rich vein discovered! Mother lode yields ${profit} gp this week`,
      };
    }
    if (veinRoll <= 4) {
      const profit = 500;
      const weeks = 2 + rollD6Fn();
      return {
        profitGp: profit,
        detail: `Rich vein! ${profit} gp now, +50% profits for ${weeks} weeks (DM note)`,
      };
    }
    const profit = 250 + rollD6Fn() * 150;
    return {
      profitGp: profit,
      detail: `Ancient dwarven cache uncovered! ${profit} gp in relic-gold`,
    };
  }

  return {
    profitGp: outcome.profitGp ?? 0,
    detail: `${outcome.profitGp} gp gross from ore sales`,
  };
}

export function simulateWeek(
  config: MineConfig,
  weekNumber: number,
  roll: number,
): WeekLedgerEntry {
  const outcome = getOutcome(roll);
  const operatingCost = calcWeeklyOperatingCost(config);
  const { profitGp: grossProfit, detail } = resolveProfit(outcome, rollD6);
  const netProfit = grossProfit - operatingCost;

  return {
    kind: "week",
    id: `week-${weekNumber}`,
    week: weekNumber,
    roll,
    outcome,
    grossProfitGp: grossProfit,
    operatingCostGp: operatingCost,
    netProfitGp: netProfit,
    detail,
  };
}

/** Rebuild treasury and week counter from history — append-only ledger, no cooked books. */
export function recomputeLedgerTotals(
  history: LedgerEntry[],
  startingTreasuryGp: number,
  startupPaid: boolean,
  startupCostGp: number,
): { treasuryGp: number; week: number } {
  let treasuryGp = startingTreasuryGp;
  if (startupPaid) treasuryGp -= startupCostGp;

  let week = 0;
  for (const entry of [...history].reverse()) {
    if (isWeekEntry(entry)) {
      treasuryGp += entry.netProfitGp;
      week = Math.max(week, entry.week);
    } else {
      treasuryGp += entry.amountGp;
    }
  }

  return { treasuryGp, week };
}

export function ledgerTotalsFromHistory(
  history: LedgerEntry[],
  config: MineConfig,
  startingTreasuryGp: number,
  startupPaid: boolean,
): { treasuryGp: number; week: number } {
  return recomputeLedgerTotals(
    history,
    startingTreasuryGp,
    startupPaid,
    calcStartupCost(config),
  );
}
