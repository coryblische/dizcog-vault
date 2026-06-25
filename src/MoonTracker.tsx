import { useEffect, useMemo, useState } from "react";
import {
  ArcaneBackdrop,
  ArcanePanel,
  ArcaneSigil,
  arcaneButtonGhostClass,
} from "./arcane-ui";
import {
  absoluteDayToHarptos,
  campaignDayToTimelineDay,
  campaignEpochToTimelineDay,
  daysSinceLastFullMoon,
  DEFAULT_CAMPAIGN_DAY,
  DEFAULT_CAMPAIGN_EPOCH,
  getMonthCalendarDays,
  HARPTOS_MONTHS,
  harptosToTimelineDay,
  lastFullMoonAbsoluteDay,
  loadCampaignDay,
  loadCampaignEpoch,
  nextFullMoonAbsoluteDay,
  randomCampaignEpoch,
  saveCampaignDay,
  saveCampaignEpoch,
  timelineDayToCampaignDay,
} from "./faerunCalendar";
import { SITE_COPY } from "./site-content";
import {
  getLunarPhaseInfo,
  getLycanthropyEffects,
  LUNAR_CYCLE_DAYS,
  moonPhaseSymbol,
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

const harptosFieldClass =
  "mt-1 w-full rounded border border-brass/40 bg-panel px-3 py-2 text-sm text-brass-light outline-none focus:border-brass";

const stepperBtnClass =
  "flex h-11 w-11 shrink-0 items-center justify-center bg-panel-light/80 font-display text-2xl leading-none text-brass-light transition hover:bg-panel hover:text-parchment disabled:cursor-not-allowed disabled:opacity-30";

function CampaignDayStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex flex-col items-center">
      <span className="mb-1 font-display text-xs tracking-wider text-parchment-dark uppercase">
        Day
      </span>
      <div className="inline-flex overflow-hidden rounded border border-brass/40 bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          className={`${stepperBtnClass} border-r border-brass/40`}
          aria-label="Previous campaign day"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          step={1}
          value={value}
          onChange={(e) => onChange(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          className="h-11 w-16 border-0 bg-panel px-1 text-center font-display text-lg font-semibold tabular-nums text-brass-light outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label="Campaign day"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className={`${stepperBtnClass} border-l border-brass/40`}
          aria-label="Next campaign day"
        >
          +
        </button>
      </div>
    </div>
  );
}

function HarptosDateFields({
  year,
  monthIndex,
  dayOfMonth,
  onChange,
}: {
  year: number;
  monthIndex: number;
  dayOfMonth: number;
  onChange: (next: { year: number; monthIndex: number; dayOfMonth: number }) => void;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
      <label className="block text-sm text-left">
        <span className="text-parchment-dark">Month</span>
        <select
          value={monthIndex}
          onChange={(e) =>
            onChange({ year, monthIndex: Number(e.target.value), dayOfMonth })
          }
          className={harptosFieldClass}
        >
          {HARPTOS_MONTHS.map((month, index) => (
            <option key={month.name} value={index}>
              {month.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-left">
        <span className="text-parchment-dark">Day</span>
        <input
          type="number"
          min={1}
          max={30}
          value={dayOfMonth}
          onChange={(e) =>
            onChange({
              year,
              monthIndex,
              dayOfMonth: Math.min(30, Math.max(1, Number(e.target.value) || 1)),
            })
          }
          className={harptosFieldClass}
        />
      </label>
      <label className="block text-sm text-left">
        <span className="text-parchment-dark">Year (DR)</span>
        <input
          type="number"
          min={1}
          step={1}
          value={year}
          onChange={(e) =>
            onChange({
              year: Math.max(1, Number(e.target.value) || DEFAULT_CAMPAIGN_EPOCH.year),
              monthIndex,
              dayOfMonth,
            })
          }
          className={harptosFieldClass}
        />
      </label>
    </div>
  );
}

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
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-brass/20 pb-2">
        <h3 className="font-display text-base font-bold tracking-wider text-brass uppercase">
          {month.name}
        </h3>
        <p className="text-sm text-parchment-dark">{month.common}</p>
      </div>

      <div className="space-y-3">
        {TENDAY_LABELS.map((label, tendayIndex) => {
          const tendayDays = days.slice(tendayIndex * 10, tendayIndex * 10 + 10);

          return (
            <div
              key={label}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[5.5rem_1fr] sm:items-center sm:gap-3"
            >
              <div className="font-display text-sm tracking-wide text-brass uppercase sm:text-right">
                {label}
              </div>
              <div className="grid grid-cols-10 gap-1">
                {tendayDays.map((cell) => (
                  <div
                    key={cell.dayOfMonth}
                    className={`flex flex-col items-center rounded border px-0.5 py-1.5 text-center sm:px-1 ${
                      cell.isToday
                        ? "border-arcane/60 bg-arcane/15 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                        : "border-brass/15 bg-panel/40"
                    }`}
                    title={`${cell.dayOfMonth} ${month.name} — ${cell.phase}`}
                  >
                    <span className="text-sm leading-none sm:text-base" aria-hidden>
                      {cell.phaseSymbol}
                    </span>
                    <span
                      className={`mt-1 font-display text-sm font-semibold tabular-nums ${
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
        })}
      </div>
    </div>
  );
}

export default function MoonTracker({ onBack, onLogout }: MoonTrackerProps) {
  const [epoch, setEpoch] = useState(loadCampaignEpoch);
  const [campaignDay, setCampaignDay] = useState(loadCampaignDay);

  const timelineDay = campaignDayToTimelineDay(campaignDay, epoch);

  useEffect(() => {
    saveCampaignDay(campaignDay);
  }, [campaignDay]);

  useEffect(() => {
    saveCampaignEpoch(epoch);
  }, [epoch]);

  const harptos = absoluteDayToHarptos(timelineDay);
  const phase = getLunarPhaseInfo(timelineDay);
  const effects = getLycanthropyEffects(timelineDay);
  const sinceFull = daysSinceLastFullMoon(timelineDay);
  const lastFullHarptos = absoluteDayToHarptos(lastFullMoonAbsoluteDay(timelineDay));
  const nextFullHarptos = absoluteDayToHarptos(nextFullMoonAbsoluteDay(timelineDay));
  const epochHarptos = absoluteDayToHarptos(campaignEpochToTimelineDay(epoch));

  const displayMonthIndex = harptos.monthIndex ?? 0;

  const setCurrentDate = (year: number, monthIndex: number, dayOfMonth: number) => {
    const timeline = harptosToTimelineDay(year, monthIndex, dayOfMonth);
    setCampaignDay(Math.max(1, timelineDayToCampaignDay(timeline, epoch)));
  };

  const resetDefaults = () => {
    setEpoch({ ...DEFAULT_CAMPAIGN_EPOCH });
    setCampaignDay(DEFAULT_CAMPAIGN_DAY);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ArcaneBackdrop />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-6">
        <header className="mb-5 text-center">
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
          <p className="mt-2 text-sm text-parchment-dark">
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
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-3xl" aria-hidden>
              {moonPhaseSymbol(phase.phase)}
            </p>
            <div>
              <p className="font-display text-xl font-bold text-brass-light md:text-2xl">
                {harptos.label}
              </p>
              <p className="mt-0.5 text-sm text-parchment-dark">
                DR {harptos.year}
                {harptos.monthCommon ? ` · ${harptos.monthCommon}` : ""}
                {harptos.festival ? " · Festival day" : ""}
              </p>
            </div>

            <CampaignDayStepper
              value={campaignDay}
              onChange={setCampaignDay}
            />
          </div>

          <div className="mt-4 grid gap-4 border-t border-brass/20 pt-4 lg:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-display text-xs font-bold tracking-wider text-brass uppercase">
                Today
              </h3>
              {!harptos.festival ? (
                <HarptosDateFields
                  year={harptos.year}
                  monthIndex={harptos.monthIndex ?? 0}
                  dayOfMonth={harptos.dayOfMonth ?? 1}
                  onChange={({ year, monthIndex, dayOfMonth }) =>
                    setCurrentDate(year, monthIndex, dayOfMonth)
                  }
                />
              ) : (
                <p className="text-sm text-parchment-dark">
                  Festival day — use − / + to reach a month day.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-xs font-bold tracking-wider text-brass uppercase">
                  Campaign start (day 1)
                </h3>
                <button
                  type="button"
                  onClick={() => setEpoch(randomCampaignEpoch())}
                  className={`${arcaneButtonGhostClass} px-2 py-1 text-xs`}
                >
                  Randomize
                </button>
              </div>
              <HarptosDateFields
                year={epoch.year}
                monthIndex={epoch.monthIndex}
                dayOfMonth={epoch.dayOfMonth}
                onChange={(next) => setEpoch(next)}
              />
              <p className="text-sm text-parchment-dark">
                Day 1 ={" "}
                <span className="text-brass-light">
                  {epochHarptos.dayOfMonth} {epochHarptos.monthName}, DR {epochHarptos.year}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetDefaults}
            className="mt-3 w-full text-sm text-parchment-dark underline-offset-2 hover:text-arcane-light hover:underline"
          >
            Reset to 21 Hammer, DR 1372
          </button>

          <dl className="mt-4 grid gap-x-4 gap-y-2 border-t border-brass/20 pt-3 text-sm sm:grid-cols-2">
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

          <p className="mt-3 border-t border-brass/10 pt-2 text-center text-sm text-parchment-dark">
            Last full moon: <span className="text-brass-light">{lastFullHarptos.label}</span>
            {" · "}
            Next full moon: <span className="text-brass-light">{nextFullHarptos.label}</span>
          </p>
        </ArcanePanel>

        {harptos.festival ? (
          <ArcanePanel className="mt-4 border-arcane/30 bg-arcane/5">
            <h2 className="mb-2 font-display text-lg font-bold tracking-wider text-brass uppercase">
              {harptos.festival}
            </h2>
            <p className="text-sm text-parchment-dark">
              Intercalary festival day — not part of any tenday. Selûne still follows the{" "}
              {LUNAR_CYCLE_DAYS}-day cycle.
            </p>
          </ArcanePanel>
        ) : (
          <ArcanePanel className="mt-4">
            <h2 className="mb-3 font-display text-sm font-bold tracking-wider text-brass uppercase">
              Lunar Calendar
            </h2>
            <HarptosMonthGrid
              year={harptos.year}
              monthIndex={displayMonthIndex}
              todayAbsoluteDay={timelineDay}
            />
            <p className="mt-4 text-center text-sm leading-relaxed text-parchment-dark">
              Moon glyphs per day — Selûne&apos;s {LUNAR_CYCLE_DAYS}-day synodic period (Faerûn).
              Highlighted cell is today.
            </p>
          </ArcanePanel>
        )}

        {effects && (
          <ArcanePanel className={`mt-4 ${SEVERITY_STYLES[effects.severity]}`}>
            <h2 className="mb-2 font-display text-lg font-bold tracking-wider text-brass uppercase">
              {effects.heading}
            </h2>
            <p className="mb-4 text-sm leading-relaxed opacity-95">{effects.summary}</p>
            <p className="mb-3 text-sm font-semibold tracking-wide text-arcane-light uppercase">
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
            <p className="mt-4 border-t border-current/20 pt-3 text-sm text-parchment-dark/80">
              Per Monster Manual p.206–207 (5e). House rules may apply.
            </p>
          </ArcanePanel>
        )}

        {timelineDay < LUNAR_CYCLE_DAYS && (
          <p className="mt-4 text-center text-sm text-parchment-dark">
            Lycanthropy effects appear after the first full moon (day {LUNAR_CYCLE_DAYS} of the
            cycle).
          </p>
        )}
      </div>
    </div>
  );
}
