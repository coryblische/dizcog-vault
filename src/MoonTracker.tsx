import { useEffect, useMemo, useState } from "react";
import {
  ArcaneBackdrop,
  ArcanePanel,
  ArcaneSigil,
  arcaneButtonGhostClass,
} from "./arcane-ui";
import {
  absoluteDayToHarptos,
  daysSinceLastFullMoon,
  getMonthCalendarDays,
  HARPTOS_MONTHS,
  lastFullMoonAbsoluteDay,
  nextFullMoonAbsoluteDay,
} from "./faerunCalendar";
import { SITE_COPY } from "./site-content";
import {
  DEFAULT_LUNAR_DAY,
  getLunarPhaseInfo,
  getLycanthropyEffects,
  LUNAR_CYCLE_DAYS,
  loadLunarDay,
  moonPhaseSymbol,
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

const TENDAY_LABELS = ["1st Tenday", "2nd Tenday", "3rd Tenday"];

function HarptosMonthGrid({
  year,
  monthIndex,
  todayAbsoluteDay,
}: {
  year: number;
  monthIndex: number;
  todayAbsoluteDay: number;
}) {
  const month = HARPTOS_MONTHS[monthIndex];
  const days = useMemo(
    () => getMonthCalendarDays(year, monthIndex, todayAbsoluteDay),
    [year, monthIndex, todayAbsoluteDay],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-brass/20 pb-2">
        <h3 className="font-display text-base font-bold tracking-wider text-brass uppercase">
          {month.name}
        </h3>
        <p className="text-xs text-parchment-dark italic">{month.common}</p>
      </div>

      <div className="mb-1 grid grid-cols-3 gap-1 text-center text-[10px] tracking-wider text-parchment-dark uppercase">
        {TENDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-10 gap-0.5 sm:gap-1">
        {days.map((cell) => (
          <div
            key={cell.dayOfMonth}
            className={`flex flex-col items-center rounded border px-0.5 py-1 text-center sm:px-1 sm:py-1.5 ${
              cell.isToday
                ? "border-arcane/60 bg-arcane/15 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                : "border-brass/15 bg-panel/40"
            }`}
            title={`${cell.dayOfMonth} ${month.name} — ${cell.phase}`}
          >
            <span className="text-[10px] leading-none sm:text-xs" aria-hidden>
              {cell.phaseSymbol}
            </span>
            <span
              className={`mt-0.5 font-display text-[10px] font-semibold tabular-nums sm:text-xs ${
                cell.isToday ? "text-arcane-light" : "text-brass-light"
              }`}
            >
              {cell.dayOfMonth}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MoonTracker({ onBack, onLogout }: MoonTrackerProps) {
  const [day, setDay] = useState(loadLunarDay);

  useEffect(() => {
    saveLunarDay(day);
  }, [day]);

  const harptos = absoluteDayToHarptos(day);
  const phase = getLunarPhaseInfo(day);
  const effects = getLycanthropyEffects(day);
  const sinceFull = daysSinceLastFullMoon(day);
  const lastFullHarptos = absoluteDayToHarptos(lastFullMoonAbsoluteDay(day));
  const nextFullHarptos = absoluteDayToHarptos(nextFullMoonAbsoluteDay(day));

  const displayMonthIndex = harptos.monthIndex ?? 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ArcaneBackdrop />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8">
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
            Calendar of Harptos — Selûne&apos;s {LUNAR_CYCLE_DAYS}-day cycle
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
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-4xl" aria-hidden>
              {moonPhaseSymbol(phase.phase)}
            </p>
            <div>
              <p className="font-display text-2xl font-bold text-brass-light md:text-3xl">
                {harptos.label}
              </p>
              <p className="mt-1 text-sm text-parchment-dark">
                DR {harptos.year}
                {harptos.monthCommon ? ` · ${harptos.monthCommon}` : ""}
                {harptos.festival ? " · Festival day" : ""}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setDay((d) => Math.max(1, d - 1))}
                disabled={day <= 1}
                className={`${arcaneButtonGhostClass} min-w-12 px-4 py-2 text-lg disabled:opacity-30`}
                aria-label="Previous day"
              >
                −
              </button>
              <span className="min-w-[5rem] font-display text-sm tracking-wider text-parchment-dark uppercase">
                Day {day}
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
              className="text-xs text-parchment-dark underline-offset-2 hover:text-arcane-light hover:underline"
            >
              Reset to {DEFAULT_LUNAR_DAY} Hammer
            </button>
          </div>

          <dl className="mt-6 grid gap-2 border-t border-brass/20 pt-4 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
              <dt className="text-parchment-dark">Lunar cycle day</dt>
              <dd className="font-semibold text-brass-light tabular-nums">
                {phase.dayInCycle} / {LUNAR_CYCLE_DAYS}
              </dd>
            </div>
            <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
              <dt className="text-parchment-dark">Phase</dt>
              <dd className="font-semibold text-brass-light">
                {moonPhaseSymbol(phase.phase)} {phase.phaseLabel}
              </dd>
            </div>
            <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
              <dt className="text-parchment-dark">Since last full moon</dt>
              <dd className="font-semibold text-brass-light tabular-nums">
                {sinceFull === 0 ? "Tonight" : `${sinceFull} day${sinceFull === 1 ? "" : "s"}`}
              </dd>
            </div>
            <div className="flex justify-between gap-4 sm:flex-col sm:justify-start">
              <dt className="text-parchment-dark">Until next full moon</dt>
              <dd className="font-semibold text-brass-light tabular-nums">
                {phase.isFullMoonNight
                  ? "Tonight"
                  : `${phase.daysUntilFullMoon} day${phase.daysUntilFullMoon === 1 ? "" : "s"}`}
              </dd>
            </div>
          </dl>

          <p className="mt-4 border-t border-brass/10 pt-3 text-center text-xs leading-relaxed text-parchment-dark">
            Last full moon: <span className="text-brass-light">{lastFullHarptos.label}</span>
            {" · "}
            Next full moon: <span className="text-brass-light">{nextFullHarptos.label}</span>
          </p>
        </ArcanePanel>

        {harptos.festival ? (
          <ArcanePanel className="mt-6 border-arcane/30 bg-arcane/5">
            <h2 className="mb-2 font-display text-lg font-bold tracking-wider text-brass uppercase">
              {harptos.festival}
            </h2>
            <p className="text-sm text-parchment-dark italic">
              Intercalary festival day — not part of any tenday. Selûne still follows the{" "}
              {LUNAR_CYCLE_DAYS}-day cycle.
            </p>
          </ArcanePanel>
        ) : (
          <ArcanePanel className="mt-6">
            <h2 className="mb-4 font-display text-sm font-bold tracking-wider text-brass uppercase">
              Lunar Calendar
            </h2>
            <HarptosMonthGrid
              year={harptos.year}
              monthIndex={displayMonthIndex}
              todayAbsoluteDay={day}
            />
            <p className="mt-4 text-center text-[10px] text-parchment-dark italic">
              Moon glyphs per day — Selûne&apos;s {LUNAR_CYCLE_DAYS}-day synodic period (Faerûn).
              Highlighted cell is today.
            </p>
          </ArcanePanel>
        )}

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
            Lycanthropy effects appear after the first full moon (day {LUNAR_CYCLE_DAYS} of the
            cycle).
          </p>
        )}
      </div>
    </div>
  );
}
