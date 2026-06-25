import { useEffect, useState } from "react";
import {
  ArcaneBackdrop,
  ArcanePanel,
  ArcaneSigil,
  arcaneButtonGhostClass,
} from "./arcane-ui";
import { SITE_COPY } from "./site-content";
import {
  DEFAULT_LUNAR_DAY,
  getLunarPhaseInfo,
  getLycanthropyEffects,
  LUNAR_CYCLE_DAYS,
  loadLunarDay,
  saveLunarDay,
} from "./moonLogic";

interface MoonTrackerProps {
  onBack: () => void;
  onLogout: () => void;
}

const SEVERITY_STYLES = {
  warning: "border-amber-400/40 bg-amber-950/25 text-amber-100",
  critical: "border-red-400/50 bg-red-950/30 text-red-100 animate-pulse-glow",
  aftermath: "border-arcane/40 bg-arcane/10 text-parchment",
};

function MoonGlyph({ phase }: { phase: string }) {
  const lit =
    phase === "full"
      ? "100%"
      : phase === "new"
        ? "0%"
        : phase.includes("waxing")
          ? phase.includes("gibbous")
            ? "85%"
            : phase.includes("quarter")
              ? "50%"
              : "25%"
          : phase.includes("waning")
            ? phase.includes("gibbous")
              ? "70%"
              : phase.includes("quarter")
                ? "45%"
                : "15%"
            : "50%";

  return (
    <div
      className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-brass/50 bg-panel shadow-[inset_0_0_24px_rgba(0,0,0,0.5),0_0_20px_rgba(0,229,255,0.15)]"
      aria-hidden
    >
      <div
        className="h-20 w-20 rounded-full bg-gradient-to-br from-parchment/90 to-brass-light/40 shadow-[0_0_16px_rgba(200,220,255,0.35)]"
        style={{
          clipPath: `inset(0 ${100 - Number.parseFloat(lit)}% 0 0)`,
        }}
      />
      <div className="absolute inset-0 rounded-full border border-brass/20" />
    </div>
  );
}

export default function MoonTracker({ onBack, onLogout }: MoonTrackerProps) {
  const [day, setDay] = useState(loadLunarDay);

  useEffect(() => {
    saveLunarDay(day);
  }, [day]);

  const phase = getLunarPhaseInfo(day);
  const effects = getLycanthropyEffects(day);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ArcaneBackdrop />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8">
        <header className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-copper to-transparent" />
            <ArcaneSigil size={32} className="text-copper-light" />
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-copper to-transparent" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-widest text-copper-light md:text-4xl">
            Moon Tracker
          </h1>
          <p className="mt-1 font-display text-sm tracking-[0.3em] text-arcane uppercase">
            {SITE_COPY.companyName}
          </p>
          <p className="mt-2 text-parchment-dark italic">
            {LUNAR_CYCLE_DAYS}-day lunar cycle — wererat lycanthropy watch
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs">
            <button type="button" onClick={onBack} className={arcaneButtonGhostClass}>
              ← Ledger
            </button>
            <button type="button" onClick={onLogout} className={arcaneButtonGhostClass}>
              Lock vault
            </button>
          </div>
        </header>

        <ArcanePanel>
          <div className="flex flex-col items-center gap-6">
            <MoonGlyph phase={phase.phase} />

            <div className="text-center">
              <p className="font-display text-xs tracking-widest text-brass uppercase">Lunar day</p>
              <div className="mt-3 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setDay((d) => Math.max(1, d - 1))}
                  disabled={day <= 1}
                  className={`${arcaneButtonGhostClass} min-w-12 px-4 py-2 text-lg disabled:opacity-30`}
                  aria-label="Previous day"
                >
                  −
                </button>
                <span className="min-w-[4rem] font-display text-4xl font-bold tabular-nums text-brass-light">
                  {day}
                </span>
                <button
                  type="button"
                  onClick={() => setDay((d) => d + 1)}
                  className={`${arcaneButtonGhostClass} min-w-12 px-4 py-2 text-lg`}
                  aria-label="Next day"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDay(DEFAULT_LUNAR_DAY)}
                className="mt-3 text-xs text-parchment-dark underline-offset-2 hover:text-arcane-light hover:underline"
              >
                Reset to day {DEFAULT_LUNAR_DAY}
              </button>
            </div>

            <dl className="grid w-full max-w-md gap-2 border-t border-brass/20 pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-parchment-dark">Day in cycle</dt>
                <dd className="font-semibold text-brass-light tabular-nums">
                  {phase.dayInCycle} / {LUNAR_CYCLE_DAYS}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-parchment-dark">Phase</dt>
                <dd className="font-semibold text-brass-light">{phase.phaseLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-parchment-dark">Until full moon</dt>
                <dd className="font-semibold text-brass-light tabular-nums">
                  {phase.isFullMoonNight
                    ? "Tonight"
                    : `${phase.daysUntilFullMoon} day${phase.daysUntilFullMoon === 1 ? "" : "s"}`}
                </dd>
              </div>
            </dl>
          </div>
        </ArcanePanel>

        {effects && (
          <ArcanePanel className={`mt-6 ${SEVERITY_STYLES[effects.severity]}`}>
            <h2 className="mb-2 font-display text-lg font-bold tracking-wider text-brass uppercase">
              {effects.heading}
            </h2>
            <p className="mb-4 text-sm leading-relaxed opacity-95">{effects.summary}</p>
            <p className="mb-3 text-xs font-semibold tracking-wide text-arcane-light uppercase">
              {effects.partyNote}
            </p>
            <ul className="space-y-2 text-sm leading-relaxed opacity-90">
              {effects.rules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span className="text-brass">◆</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-current/20 pt-3 text-xs italic opacity-70">
              Per Monster Manual p.206–207 (5e). House rules may apply.
            </p>
          </ArcanePanel>
        )}

        {day < LUNAR_CYCLE_DAYS && (
          <p className="mt-4 text-center text-xs text-parchment-dark italic">
            Lycanthropy effects appear once the calendar reaches day {LUNAR_CYCLE_DAYS} (first full
            moon).
          </p>
        )}
      </div>
    </div>
  );
}
