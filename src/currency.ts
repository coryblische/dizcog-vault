export type CoinType = "pp" | "gp" | "ep" | "sp" | "cp";

export interface CoinDenomination {
  type: CoinType;
  count: number;
}

/** D&D 5e standard exchange rates (values in copper pieces) */
export const COIN_CP: Record<CoinType, number> = {
  cp: 1,
  sp: 10,
  ep: 50,
  gp: 100,
  pp: 1000,
};

const COIN_ORDER: CoinType[] = ["pp", "gp", "ep", "sp", "cp"];

export { COIN_ORDER };

/** Sum coin counts into gp (fractional gp allowed from cp/sp). */
export function coinsToGp(counts: Partial<Record<CoinType, number>>): number {
  let totalCp = 0;
  for (const type of COIN_ORDER) {
    const count = counts[type] ?? 0;
    if (count > 0) totalCp += count * COIN_CP[type];
  }
  return totalCp / COIN_CP.gp;
}

export function emptyCoinCounts(): Record<CoinType, number> {
  return { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
}

/** Convert gp (may be fractional) to copper pieces */
export function gpToCp(gp: number): number {
  return Math.round(Math.abs(gp) * COIN_CP.gp);
}

/** Greedy breakdown per PHB exchange table */
export function breakDownCp(totalCp: number): CoinDenomination[] {
  let remaining = Math.max(0, Math.round(totalCp));
  const result: CoinDenomination[] = [];

  for (const type of COIN_ORDER) {
    const value = COIN_CP[type];
    const count = Math.floor(remaining / value);
    if (count > 0) {
      result.push({ type, count });
      remaining -= count * value;
    }
  }

  if (result.length === 0) {
    result.push({ type: "cp", count: 0 });
  }

  return result;
}

export function breakDownGp(gp: number): CoinDenomination[] {
  return breakDownCp(gpToCp(gp));
}

export const COIN_LABELS: Record<CoinType, string> = {
  cp: "Copper",
  sp: "Silver",
  ep: "Electrum",
  gp: "Gold",
  pp: "Platinum",
};

export const COIN_SHORT: Record<CoinType, string> = {
  cp: "cp",
  sp: "sp",
  ep: "ep",
  gp: "gp",
  pp: "pp",
};

/** e.g. "50 platinum, 2 gold, 8 silver" */
export function formatCoinBreakdown(gp: number): string {
  const coins = breakDownGp(gp).filter((c) => c.count > 0);
  if (coins.length === 0) return "0 copper";
  return coins.map((c) => `${c.count} ${COIN_LABELS[c.type].toLowerCase()}`).join(", ");
}
