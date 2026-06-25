export interface OperatingCostLine {
  id: string;
  label: string;
  amountGp: number;
}

export interface OperatingCosts {
  startup: OperatingCostLine[];
  weekly: OperatingCostLine[];
}

export interface MineConfig {
  miningToolsGp: number;
  lanternOilInitialGp: number;
  lanternOilMonthlyGp: number;
  foodInitialGp: number;
  foodMonthlyGp: number;
  animalsGp: number;
  cartsGp: number;
  delgadoGpPerDay: number;
  minerSpPerDay: number;
  minerCount: number;
  guardGpPerDay: number;
  guardCount: number;
  cookGpPerDay: number;
  bookkeeperGpPerDay: number;
  daysPerWeek: number;
  startingTreasuryGp: number;
}

export type OutcomeTone =
  | "disaster"
  | "poor"
  | "average"
  | "good"
  | "excellent"
  | "rich";

export interface RollOutcome {
  roll: number;
  name: string;
  description: string;
  profitGp: number | null;
  isSpecial: boolean;
  tone: OutcomeTone;
}

export interface WeekRecord {
  week: number;
  roll: number;
  outcome: RollOutcome;
  grossProfitGp: number;
  operatingCostGp: number;
  netProfitGp: number;
  detail: string;
}

export interface WeekLedgerEntry extends WeekRecord {
  kind: "week";
  id: string;
}

export interface InfusionLedgerEntry {
  kind: "infusion";
  id: string;
  week: number;
  amountGp: number;
  detail: string;
}

export type LedgerEntry = WeekLedgerEntry | InfusionLedgerEntry;

export function isWeekEntry(entry: LedgerEntry): entry is WeekLedgerEntry {
  return entry.kind === "week";
}

/** Upgrade saved ledgers from before infusion entries existed. */
export function normalizeLedgerHistory(history: unknown[]): LedgerEntry[] {
  return history.map((raw, index) => {
    if (raw && typeof raw === "object" && "kind" in raw) {
      return raw as LedgerEntry;
    }
    const week = raw as WeekRecord;
    return {
      kind: "week",
      id: `week-${week.week}-${index}`,
      ...week,
    };
  });
}

export interface GameState {
  config: MineConfig;
  treasuryGp: number;
  week: number;
  startupPaid: boolean;
  history: LedgerEntry[];
  lastRoll: number | null;
  isRolling: boolean;
}

export interface SavedLedger {
  treasuryGp: number;
  week: number;
  startupPaid: boolean;
  history: LedgerEntry[];
  guardCount: number;
  startingTreasury: number;
  startupCostLines?: OperatingCostLine[];
  weeklyCostLines?: OperatingCostLine[];
  savedAt?: string;
}

export interface SavedMoonTracker {
  epoch: {
    year: number;
    monthIndex: number;
    dayOfMonth: number;
  };
  campaignDay: number;
  biteDay: number;
  savedAt?: string;
}
