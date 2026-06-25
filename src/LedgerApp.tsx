import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDefaultOperatingCosts,
  DEFAULT_CONFIG,
  getOutcome,
  ledgerTotalsFromHistory,
  ROLL_OUTCOMES,
  resolveOperatingCosts,
  rollD6,
  simulateWeek,
  sumOperatingCostLines,
} from "./mineLogic";
import { CoinIcon, CurrencyDisplay } from "./CurrencyDisplay";
import { breakDownGp, formatCoinBreakdown } from "./currency";
import { InfuseCapitalForm } from "./InfuseCapitalForm";
import OperatingCostsPanel from "./OperatingCostsPanel";
import {
  ArcaneBackdrop,
  ArcanePanel,
  ArcaneSigil,
  arcaneButtonClass,
  arcaneButtonGhostClass,
} from "./arcane-ui";
import type {
  GameState,
  InfusionLedgerEntry,
  LedgerEntry,
  OperatingCostLine,
  SavedLedger,
  WeekLedgerEntry,
} from "./types";
import { isWeekEntry, normalizeLedgerHistory } from "./types";
import { SITE_COPY } from "./site-content";

function DieFace({
  value,
  rolling,
  startupComplete,
}: {
  value: number | null;
  rolling: boolean;
  startupComplete?: boolean;
}) {
  const dots: Record<number, number[][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
  };

  const positions = value ? dots[value] : null;

  return (
    <div
      className={`relative flex h-24 w-24 items-center justify-center rounded-lg border-2 bg-gradient-to-br from-copper-dark to-panel shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] ${
        startupComplete
          ? "animate-startup-flash border-arcane-light shadow-[0_0_30px_rgba(0,229,255,0.5)]"
          : "border-copper/70 shadow-[0_0_20px_rgba(0,229,255,0.12),inset_0_0_12px_rgba(94,184,212,0.08)]"
      } ${rolling ? "animate-dice-shake" : ""}`}
    >
      {startupComplete ? (
        <svg
          className="h-14 w-14 animate-checkmark-reveal animate-checkmark-shine"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 26 L20 36 L38 14" className="text-arcane-light" stroke="currentColor" />
        </svg>
      ) : positions ? (
        <div className="grid h-16 w-16 grid-cols-3 grid-rows-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const hasDot = positions.some(([r, c]) => r === row && c === col);
            return (
              <div key={i} className="flex items-center justify-center">
                {hasDot && (
                  <div className="h-3 w-3 rounded-full bg-arcane-light shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <span className="font-display text-4xl font-bold text-arcane-light">?</span>
      )}
    </div>
  );
}

const TONE_STYLES: Record<string, string> = {
  disaster: "text-red-400 border-red-500/50 bg-red-950/40",
  poor: "text-steam border-steam/30 bg-panel-light",
  average: "text-parchment border-brass/30 bg-panel-light",
  good: "text-brass-light border-brass/50 bg-brass/10",
  excellent: "text-amber-300 border-amber-400/50 bg-amber-950/30",
  rich: "text-yellow-200 border-yellow-400/60 bg-yellow-950/30 animate-pulse-glow",
};

function CompactCoins({ amountGp, className = "" }: { amountGp: number; className?: string }) {
  const negative = amountGp < 0;
  const coins = breakDownGp(Math.abs(amountGp)).filter((c) => c.count > 0);
  const short =
    coins.length > 0
      ? coins.map((c) => `${c.count}${c.type}`).join(" ")
      : "0cp";

  return (
    <span
      className={`text-xs leading-snug tabular-nums ${negative ? "text-red-400" : "text-brass-light"} ${className}`}
      title={formatCoinBreakdown(amountGp)}
    >
      {negative ? "−" : ""}
      {short}
    </span>
  );
}

const INFUSION_STYLE = "text-arcane-light border-arcane/40 bg-arcane/10";
const HISTORY_PAGE_SIZE = 6;

function LastSettlementPanel({
  record,
  className = "",
}: {
  record: WeekLedgerEntry;
  className?: string;
}) {
  return (
    <ArcanePanel className={`min-w-0 flex-1 lg:max-w-xs ${className}`}>
      <h2 className="mb-2 font-display text-xs font-bold tracking-wider text-brass uppercase sm:text-sm">
        Last Settlement
      </h2>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-parchment-dark">Gross</span>
          <CurrencyDisplay amountGp={record.grossProfitGp} size="sm" className="text-brass-light" tooltipAlign="end" />
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-parchment-dark">Costs</span>
          <CurrencyDisplay amountGp={-record.operatingCostGp} size="sm" className="text-red-400/80" tooltipAlign="end" />
        </div>
        <div className="flex justify-between gap-3 border-t border-brass/30 pt-2 font-bold">
          <span>Net</span>
          <CurrencyDisplay
            amountGp={record.netProfitGp}
            size="sm"
            className={record.netProfitGp >= 0 ? "text-brass-light" : "text-red-400"}
            tooltipAlign="end"
          />
        </div>
      </div>
    </ArcanePanel>
  );
}

function LedgerHistory({
  history,
  currentWeek,
  onVoidEntry,
  onRerollWeek,
}: {
  history: LedgerEntry[];
  currentWeek: number;
  onVoidEntry: (entryId: string) => void;
  onRerollWeek: (entryId: string) => void;
}) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  useEffect(() => {
    setPage(0);
  }, [history.length]);

  if (history.length === 0) return null;

  const start = safePage * HISTORY_PAGE_SIZE;
  const visible = history.slice(start, start + HISTORY_PAGE_SIZE);
  const rangeStart = start + 1;
  const rangeEnd = start + visible.length;

  return (
    <ArcanePanel>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-wider text-brass uppercase">
            Ledger History
          </h2>
          <p className="mt-1 text-xs text-parchment-dark italic">
            Only the current week may be re-rolled. Entries may be voided — never hand-edited.
          </p>
        </div>
        {history.length > HISTORY_PAGE_SIZE && (
          <p className="font-display text-xs tracking-wider text-parchment-dark uppercase">
            {rangeStart}–{rangeEnd} of {history.length}
          </p>
        )}
      </div>

      {/* mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {visible.map((entry) =>
          isWeekEntry(entry) ? (
            <div
              key={entry.id}
              className={`rounded border p-3 ${TONE_STYLES[entry.outcome.tone]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display font-semibold">
                    Week {entry.week} · Roll {entry.roll}
                  </p>
                  <p className="text-sm opacity-90">{entry.outcome.name}</p>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <CurrencyDisplay
                    amountGp={entry.netProfitGp}
                    size="sm"
                    className={entry.netProfitGp >= 0 ? "text-brass-light" : "text-red-400"}
                  />
                  <button
                    type="button"
                    onClick={() => onRerollWeek(entry.id)}
                    disabled={entry.week !== currentWeek}
                    className="rounded border border-copper/30 px-1.5 py-0.5 font-display text-[10px] tracking-wider text-parchment-dark uppercase transition hover:border-arcane/50 hover:text-arcane-light disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-copper/30 disabled:hover:text-parchment-dark"
                    title={
                      entry.week === currentWeek
                        ? "Re-roll this week's d6"
                        : "Only the current week can be re-rolled"
                    }
                  >
                    Reroll
                  </button>
                  <button
                    type="button"
                    onClick={() => onVoidEntry(entry.id)}
                    className="rounded border border-copper/30 px-1.5 py-0.5 font-display text-[10px] tracking-wider text-parchment-dark uppercase transition hover:border-red-400/50 hover:text-red-400"
                    title="Strike entry from ledger"
                  >
                    Void
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-2 border-t border-current/20 pt-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-parchment-dark">Gross</dt>
                  <dd>
                    <CurrencyDisplay amountGp={entry.grossProfitGp} size="sm" />
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-parchment-dark">Costs</dt>
                  <dd>
                    <CurrencyDisplay amountGp={-entry.operatingCostGp} size="sm" className="text-red-400/80" />
                  </dd>
                </div>
                <div className="flex justify-between gap-2 font-semibold">
                  <dt>Net</dt>
                  <dd>
                    <CurrencyDisplay
                      amountGp={entry.netProfitGp}
                      size="sm"
                      className={entry.netProfitGp >= 0 ? "text-brass-light" : "text-red-400"}
                    />
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div key={entry.id} className={`rounded border p-3 ${INFUSION_STYLE}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display font-semibold">Capital Infusion</p>
                  <p className="text-sm opacity-90">
                    After week {entry.week} · {entry.detail}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <CurrencyDisplay amountGp={entry.amountGp} size="sm" className="text-arcane-light" />
                  <button
                    type="button"
                    onClick={() => onVoidEntry(entry.id)}
                    className="rounded border border-copper/30 px-1.5 py-0.5 font-display text-[10px] tracking-wider text-parchment-dark uppercase transition hover:border-red-400/50 hover:text-red-400"
                    title="Strike entry from ledger"
                  >
                    Void
                  </button>
                </div>
              </div>
            </div>
          ),
        )}
      </div>

      {/* desktop: compact table */}
      <div className="hidden md:block">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-brass/30 text-left text-xs tracking-wide text-parchment-dark uppercase">
              <th className="w-10 pb-2 pr-2">Wk</th>
              <th className="w-10 pb-2 pr-2">Roll</th>
              <th className="pb-2 pr-2">Outcome</th>
              <th className="w-[18%] pb-2 pr-2 text-right">Gross</th>
              <th className="w-[18%] pb-2 pr-2 text-right">Costs</th>
              <th className="w-[18%] pb-2 text-right">Net</th>
              <th className="w-24 pb-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) =>
              isWeekEntry(entry) ? (
                <tr key={entry.id} className="border-b border-brass/10 align-top">
                  <td className="py-2 pr-2 tabular-nums">{entry.week}</td>
                  <td className="py-2 pr-2 font-bold text-brass tabular-nums">{entry.roll}</td>
                  <td className="py-2 pr-2">
                    <span className="line-clamp-2" title={entry.outcome.name}>
                      {entry.outcome.name}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <CompactCoins amountGp={entry.grossProfitGp} className="inline-block" />
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <CompactCoins amountGp={-entry.operatingCostGp} className="inline-block text-red-400/80" />
                  </td>
                  <td
                    className={`py-2 pr-2 text-right font-semibold ${entry.netProfitGp >= 0 ? "text-brass-light" : "text-red-400"}`}
                  >
                    <CompactCoins amountGp={entry.netProfitGp} className="inline-block" />
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onRerollWeek(entry.id)}
                        disabled={entry.week !== currentWeek}
                        className="rounded border border-copper/30 px-1.5 py-0.5 font-display text-[10px] tracking-wider text-parchment-dark uppercase transition hover:border-arcane/50 hover:text-arcane-light disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-copper/30 disabled:hover:text-parchment-dark"
                        title={
                          entry.week === currentWeek
                            ? "Re-roll this week's d6"
                            : "Only the current week can be re-rolled"
                        }
                      >
                        Reroll
                      </button>
                      <button
                        type="button"
                        onClick={() => onVoidEntry(entry.id)}
                        className="rounded border border-copper/30 px-1.5 py-0.5 font-display text-[10px] tracking-wider text-parchment-dark uppercase transition hover:border-red-400/50 hover:text-red-400"
                      >
                        Void
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={entry.id} className={`border-b border-brass/10 align-top ${INFUSION_STYLE}`}>
                  <td className="py-2 pr-2 tabular-nums">{entry.week}</td>
                  <td className="py-2 pr-2 text-arcane">✦</td>
                  <td className="py-2 pr-2">
                    <span className="font-display font-semibold">Capital Infusion</span>
                    <span className="mt-0.5 block text-xs opacity-80">{entry.detail}</span>
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <CompactCoins amountGp={entry.amountGp} className="inline-block text-arcane-light" />
                  </td>
                  <td className="py-2 pr-2 text-right text-parchment-dark/40">—</td>
                  <td className="py-2 pr-2 text-right font-semibold text-arcane-light">
                    <CompactCoins amountGp={entry.amountGp} className="inline-block" />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onVoidEntry(entry.id)}
                      className="rounded border border-copper/30 px-1.5 py-0.5 font-display text-[10px] tracking-wider text-parchment-dark uppercase transition hover:border-red-400/50 hover:text-red-400"
                    >
                      Void
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 border-t border-brass/20 pt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className={arcaneButtonGhostClass}
          >
            ← Newer
          </button>
          <span className="font-display text-xs tracking-widest text-parchment-dark">
            Page {safePage + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className={arcaneButtonGhostClass}
          >
            Older →
          </button>
        </div>
      )}
    </ArcanePanel>
  );
}

function toSnapshot(
  state: GameState,
  startingTreasury: number,
  startupCostLines: OperatingCostLine[],
  weeklyCostLines: OperatingCostLine[],
): SavedLedger {
  const startupCostGp = sumOperatingCostLines(startupCostLines);
  const { treasuryGp, week } = ledgerTotalsFromHistory(
    state.history,
    startingTreasury,
    state.startupPaid,
    startupCostGp,
  );

  return {
    treasuryGp,
    week,
    startupPaid: state.startupPaid,
    history: state.history,
    guardCount: DEFAULT_CONFIG.guardCount,
    startingTreasury,
    startupCostLines,
    weeklyCostLines,
  };
}

interface LedgerAppProps {
  onLogout: () => void;
  onOpenMoonTracker: () => void;
  loadLedger: () => Promise<SavedLedger | null>;
  saveLedger: (ledger: SavedLedger) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export default function LedgerApp({
  onLogout,
  onOpenMoonTracker,
  loadLedger,
  saveLedger,
}: LedgerAppProps) {
  const [state, setState] = useState<GameState>(() => ({
    config: DEFAULT_CONFIG,
    treasuryGp: DEFAULT_CONFIG.startingTreasuryGp,
    week: 0,
    startupPaid: false,
    history: [],
    lastRoll: null,
    isRolling: false,
  }));

  const [startingTreasury, setStartingTreasury] = useState(
    DEFAULT_CONFIG.startingTreasuryGp,
  );
  const defaultCosts = useMemo(() => buildDefaultOperatingCosts(), []);
  const [startupCostLines, setStartupCostLines] = useState<OperatingCostLine[]>(
    () => defaultCosts.startup.map((line) => ({ ...line })),
  );
  const [weeklyCostLines, setWeeklyCostLines] = useState<OperatingCostLine[]>(
    () => defaultCosts.weekly.map((line) => ({ ...line })),
  );
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [startupCelebrating, setStartupCelebrating] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    loadLedger()
      .then((saved) => {
        if (saved) {
          const history = normalizeLedgerHistory(saved.history as unknown[]);
          const operatingCosts = resolveOperatingCosts(saved);
          const { treasuryGp, week } = ledgerTotalsFromHistory(
            history,
            saved.startingTreasury,
            saved.startupPaid,
            sumOperatingCostLines(operatingCosts.startup),
          );

          setState((s) => ({
            ...s,
            treasuryGp,
            week,
            startupPaid: saved.startupPaid,
            history,
            lastRoll: null,
            isRolling: false,
          }));
          setStartingTreasury(saved.startingTreasury);
          setStartupCostLines(operatingCosts.startup);
          setWeeklyCostLines(operatingCosts.weekly);
        }
      })
      .finally(() => {
        skipSave.current = true;
        setHydrated(true);
      });
  }, [loadLedger]);

  const snapshot = useMemo(
    () => toSnapshot(state, startingTreasury, startupCostLines, weeklyCostLines),
    [state, startingTreasury, startupCostLines, weeklyCostLines],
  );

  useEffect(() => {
    if (!hydrated) return;

    if (skipSave.current) {
      skipSave.current = false;
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);
    const timer = window.setTimeout(() => {
      saveLedger(snapshot).then((result) => {
        if (result.ok) {
          setSaveStatus("saved");
          setSaveError(null);
        } else {
          setSaveStatus("error");
          setSaveError(result.error);
        }
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [snapshot, hydrated, saveLedger]);

  const startupCost = sumOperatingCostLines(startupCostLines);
  const weeklyCost = sumOperatingCostLines(weeklyCostLines);
  const { treasuryGp, week: ledgerWeek } = useMemo(
    () =>
      ledgerTotalsFromHistory(
        state.history,
        startingTreasury,
        state.startupPaid,
        startupCost,
      ),
    [state.history, startingTreasury, state.startupPaid, startupCost],
  );
  const netToDate = treasuryGp - startingTreasury;

  const payStartup = useCallback(() => {
    if (state.startupPaid) return;
    if (treasuryGp < startupCost) return;
    setStartupCelebrating(true);
    setState((s) => {
      const { treasuryGp, week } = ledgerTotalsFromHistory(
        s.history,
        startingTreasury,
        true,
        startupCost,
      );
      return {
        ...s,
        startupPaid: true,
        treasuryGp,
        week,
      };
    });
    window.setTimeout(() => setStartupCelebrating(false), 2800);
  }, [state.startupPaid, treasuryGp, startupCost, startingTreasury]);

  const runWeek = useCallback(() => {
    if (!state.startupPaid || state.isRolling) return;
    if (treasuryGp < weeklyCost) return;

    setState((s) => ({ ...s, isRolling: true, lastRoll: null }));

    let ticks = 0;
    const interval = setInterval(() => {
      setState((s) => ({ ...s, lastRoll: rollD6() }));
      ticks++;
      if (ticks >= 8) {
        clearInterval(interval);
        const finalRoll = rollD6();
        const weekNum = ledgerWeek + 1;
        const record = simulateWeek(weeklyCost, weekNum, finalRoll);

        setState((s) => {
          const history = [record, ...s.history];
          const { treasuryGp, week } = ledgerTotalsFromHistory(
            history,
            startingTreasury,
            s.startupPaid,
            startupCost,
          );
          return {
            ...s,
            history,
            treasuryGp,
            week,
            lastRoll: finalRoll,
            isRolling: false,
          };
        });
      }
    }, 80);
  }, [state.startupPaid, state.isRolling, treasuryGp, ledgerWeek, weeklyCost, startingTreasury, startupCost]);

  const reset = useCallback(() => {
    const defaults = buildDefaultOperatingCosts();
    setStartupCostLines(defaults.startup.map((line) => ({ ...line })));
    setWeeklyCostLines(defaults.weekly.map((line) => ({ ...line })));
    setState({
      config: DEFAULT_CONFIG,
      treasuryGp: startingTreasury,
      week: 0,
      startupPaid: false,
      history: [],
      lastRoll: null,
      isRolling: false,
    });
  }, [startingTreasury]);

  const lastWeekRecord =
    state.history.find((entry): entry is WeekLedgerEntry => isWeekEntry(entry)) ?? null;
  const currentOutcome =
    state.lastRoll !== null ? getOutcome(state.lastRoll) : null;
  const canOperate = state.startupPaid && treasuryGp >= weeklyCost;
  const needsCapitalInfusion = state.startupPaid && treasuryGp < weeklyCost;

  const infuseCapital = useCallback((amountGp: number) => {
    if (amountGp <= 0) return;
    setState((s) => {
      const entry: InfusionLedgerEntry = {
        kind: "infusion",
        id: `infusion-${Date.now()}`,
        week: ledgerWeek,
        amountGp,
        detail: formatCoinBreakdown(amountGp),
      };
      const history = [entry, ...s.history];
      const { treasuryGp, week } = ledgerTotalsFromHistory(
        history,
        startingTreasury,
        s.startupPaid,
        startupCost,
      );
      return {
        ...s,
        history,
        treasuryGp,
        week,
      };
    });
  }, [startingTreasury, ledgerWeek, startupCost]);

  const rerollWeekEntry = useCallback(
    (entryId: string) => {
      const entry = state.history.find((item) => item.id === entryId);
      if (!entry || !isWeekEntry(entry) || entry.week !== ledgerWeek) return;

      if (
        !window.confirm(
          "Re-roll this week's d6? The current settlement will be replaced — not hand-edited.",
        )
      ) {
        return;
      }

      setState((s) => {
        const index = s.history.findIndex((item) => item.id === entryId);
        if (index < 0) return s;

        const current = s.history[index];
        if (!isWeekEntry(current) || current.week !== ledgerWeek) return s;

        const rerolled = simulateWeek(weeklyCost, current.week, rollD6());
        const history = [...s.history];
        history[index] = { ...rerolled, id: current.id };

        const { treasuryGp, week } = ledgerTotalsFromHistory(
          history,
          startingTreasury,
          s.startupPaid,
          startupCost,
        );

        return { ...s, history, treasuryGp, week, lastRoll: rerolled.roll };
      });
    },
    [state.history, ledgerWeek, startingTreasury, weeklyCost, startupCost],
  );

  const voidEntry = useCallback(
    (entryId: string) => {
      if (
        !window.confirm(
          "Strike this entry from the ledger? Treasury will be recalculated. (Cooking the Books is not permitted.)",
        )
      ) {
        return;
      }

      setState((s) => {
        const history = s.history.filter((entry) => entry.id !== entryId);
        const { treasuryGp, week } = ledgerTotalsFromHistory(
          history,
          startingTreasury,
          s.startupPaid,
          startupCost,
        );
        return { ...s, history, treasuryGp, week };
      });
    },
    [startingTreasury, startupCost],
  );

  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Ledger saved"
        : saveStatus === "error"
          ? saveError ?? "Save failed"
          : hydrated
            ? "Autosave on"
            : "Loading…";

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ArcaneBackdrop />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-copper to-transparent" />
            <ArcaneSigil size={32} className="text-copper-light" />
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-copper to-transparent" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-widest text-copper-light md:text-4xl">
            {SITE_COPY.companyName}
          </h1>
          <p className="mt-1 font-display text-sm tracking-[0.3em] text-arcane uppercase">
            {SITE_COPY.ledgerSubtitle}
          </p>
          <p className="mt-2 text-parchment-dark italic">
            Arcane-powered accounting engine for your D&amp;D gold mine
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span
              className={`rounded border px-2 py-1 ${
                saveStatus === "error"
                  ? "border-red-400/50 text-red-400"
                  : saveStatus === "saved"
                    ? "border-arcane/40 text-arcane-light"
                    : "border-copper/20 text-parchment-dark"
              }`}
            >
              {saveLabel}
            </span>
            <button type="button" onClick={onOpenMoonTracker} className={arcaneButtonGhostClass}>
              Moon Tracker
            </button>
            <button onClick={onLogout} className={arcaneButtonGhostClass}>
              Lock vault
            </button>
          </div>
        </header>

        <div className="space-y-6">
          <ArcanePanel
            className={`min-w-0 transition-colors duration-500 ${startupCelebrating ? "animate-startup-flash" : ""}`}
          >
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-display text-xs tracking-widest text-brass uppercase">
                    Treasury
                  </p>
                  <div className="mt-1">
                    <CurrencyDisplay
                      amountGp={treasuryGp}
                      size="lg"
                      className="font-display font-bold text-brass-light"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-parchment-dark">Week {ledgerWeek}</p>
                  <p
                    className={`flex items-center justify-end gap-1 text-lg font-semibold ${netToDate >= 0 ? "text-brass-light" : "text-red-400"}`}
                  >
                    <span>Net to date:</span>
                    <CurrencyDisplay amountGp={netToDate} size="md" tooltipAlign="end" />
                  </p>
                </div>
              </div>

              <div className="mb-6 flex flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:justify-center">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:flex-1">
                  <DieFace
                    value={state.lastRoll}
                    rolling={state.isRolling}
                    startupComplete={startupCelebrating}
                  />
                  {startupCelebrating && (
                    <div className="animate-fade-in-up rounded border-2 border-brass/60 bg-brass/10 px-4 py-3 text-center">
                      <p className="font-display text-lg font-bold text-brass-light">
                        Mine Operational
                      </p>
                      <p className="text-sm text-parchment-dark italic">
                        Startup costs settled — shafts cleared for production
                      </p>
                    </div>
                  )}
                  {!startupCelebrating && currentOutcome && !state.isRolling && (
                    <div
                      className={`rounded border-2 px-4 py-3 text-center ${TONE_STYLES[currentOutcome.tone]}`}
                    >
                      <p className="font-display text-lg font-bold">{currentOutcome.name}</p>
                      <p className="text-sm opacity-80">{currentOutcome.description}</p>
                    </div>
                  )}
                </div>
                {lastWeekRecord && <LastSettlementPanel record={lastWeekRecord} />}
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {!state.startupPaid ? (
                  <button
                    onClick={payStartup}
                    disabled={treasuryGp < startupCost}
                    className={`inline-flex flex-wrap items-center justify-center gap-1 ${arcaneButtonClass}`}
                  >
                    Pay Startup (
                    <CurrencyDisplay amountGp={startupCost} size="sm" className="inline-flex" />
                    )
                  </button>
                ) : (
                  <button
                    onClick={runWeek}
                    disabled={!canOperate || state.isRolling || startupCelebrating}
                    className={`${arcaneButtonClass} px-8 ${
                      state.startupPaid && !startupCelebrating ? "animate-fade-in-up" : ""
                    }`}
                  >
                    {state.isRolling ? "Rolling d6…" : "Roll Week & Settle"}
                  </button>
                )}
                <button onClick={reset} className={arcaneButtonGhostClass}>
                  Reset Ledger
                </button>
              </div>

              {!state.startupPaid && (
                <p className="mt-4 text-center text-sm text-parchment-dark italic">
                  Pay startup costs before the mine can operate.
                </p>
              )}
              {needsCapitalInfusion && (
                <div className="mt-4 rounded border border-arcane/30 bg-arcane/5 p-4">
                  <p className="mb-1 flex flex-wrap items-center justify-center gap-1 text-center text-sm text-red-400">
                    <span>Insufficient funds for weekly operations (</span>
                    <CurrencyDisplay amountGp={weeklyCost} size="sm" />
                    <span>required).</span>
                  </p>
                  <p className="mb-2 text-center text-xs text-parchment-dark italic">
                    Infuse capital from proprietor holdings to resume operations.
                  </p>
                  <InfuseCapitalForm onInfuse={infuseCapital} compact />
                </div>
              )}
          </ArcanePanel>

          <LedgerHistory
            history={state.history}
            currentWeek={ledgerWeek}
            onVoidEntry={voidEntry}
            onRerollWeek={rerollWeekEntry}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <OperatingCostsPanel
              startupLines={startupCostLines}
              weeklyLines={weeklyCostLines}
              onStartupLinesChange={setStartupCostLines}
              onWeeklyLinesChange={setWeeklyCostLines}
              startupLocked={state.startupPaid}
            />

            <ArcanePanel>
              <h2 className="mb-3 font-display text-sm font-bold tracking-wider text-brass uppercase">
                Proprietor Settings
              </h2>
              <label className="mb-3 block text-sm">
                <span className="text-parchment-dark">Starting treasury</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={startingTreasury}
                  onChange={(e) => setStartingTreasury(Number(e.target.value))}
                  disabled={ledgerWeek > 0 || state.startupPaid}
                  className="mt-1 w-full rounded border border-brass/40 bg-panel px-3 py-2 text-brass-light outline-none focus:border-brass disabled:opacity-50"
                />
              </label>
              <InfuseCapitalForm onInfuse={infuseCapital} />
            </ArcanePanel>
          </div>

          <ArcanePanel className="min-w-0">
            <h2 className="mb-3 font-display text-sm font-bold tracking-wider text-brass uppercase">
              DM Weekly Income (d6)
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ROLL_OUTCOMES.map((o) => (
                <div
                  key={o.roll}
                  className={`flex items-start gap-2 rounded border p-2 ${TONE_STYLES[o.tone]}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-current font-display text-sm font-bold">
                    {o.roll}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold">{o.name}</p>
                    <p className="text-xs opacity-80">
                      {o.profitGp !== null ? (
                        <span className="inline-flex items-center gap-1">
                          <CurrencyDisplay amountGp={o.profitGp} size="sm" /> profit
                        </span>
                      ) : o.roll === 1 ? (
                        "Cave-in, losses"
                      ) : o.roll === 5 ? (
                        <span className="inline-flex items-center gap-1">
                          300+ <CoinIcon type="gp" size={12} /> profit
                        </span>
                      ) : (
                        "Special event"
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ArcanePanel>
        </div>

        <footer className="mt-8 text-center text-sm text-parchment-dark/60 italic">
          &copy; 1493 DR, the Year of Three Ships Sailing | DizCog™ | Forged in copper and conjury — may your veins run gold, and your cave-ins be few.
        </footer>
      </div>
    </div>
  );
}
