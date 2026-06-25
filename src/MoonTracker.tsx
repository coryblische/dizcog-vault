import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArcaneBackdrop,
  ArcanePanel,
  ArcaneSigil,
  arcaneButtonGhostClass,
} from "./arcane-ui";
import {
  absoluteDayToHarptos,
  campaignDayToTimelineDay,
  daysSinceLastFullMoon,
  DEFAULT_BITE_DAY,
  DEFAULT_CAMPAIGN_DAY,
  DEFAULT_CAMPAIGN_EPOCH,
  getMonthCalendarDays,
  HARPTOS_MONTHS,
  harptosToTimelineDay,
  lastFullMoonAbsoluteDay,
  loadBiteDay,
  loadCampaignDay,
  loadCampaignEpoch,
  nextFullMoonAbsoluteDay,
  randomCampaignEpoch,
  saveBiteDay,
  saveCampaignDay,
  saveCampaignEpoch,
  timelineDayToCampaignDay,
  type CampaignEpoch,
} from "./faerunCalendar";
import { SITE_COPY } from "./site-content";
import {
  FULL_MOON_APPROACH_DAYS,
  getLunarPhaseInfo,
  getLycanthropyEffects,
  LUNAR_CYCLE_DAYS,
  moonPhaseSymbol,
} from "./moonLogic";
import type { SavedMoonTracker } from "./types";

interface MoonTrackerProps {
  onBack: () => void;
  onLogout: () => void;
  loadMoonTracker: () => Promise<SavedMoonTracker | null>;
  saveMoonTracker: (
    moonTracker: SavedMoonTracker,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const SEVERITY_STYLES = {
  warning: "border-amber-400/40 bg-amber-950/25 text-amber-100",
  critical: "border-red-400/50 bg-red-950/30 text-red-100 animate-pulse-glow",
  aftermath: "border-arcane/40 bg-arcane/10 text-parchment",
};

const TENDAY_LABELS = ["1st Tenday", "2nd Tenday", "3rd Tenday"];

const harptosFieldClass =
  "mt-1 w-full rounded border border-brass/40 bg-panel px-3 py-2 text-sm text-brass-light outline-none focus:border-brass";

function FullMoonCountdown({
  phase,
  nextFullHarptos,
}: {
  phase: ReturnType<typeof getLunarPhaseInfo>;
  nextFullHarptos: ReturnType<typeof absoluteDayToHarptos>;
}) {
  const daysLeft = phase.daysUntilFullMoon;

  return (
    <div
      className={`mt-3 rounded border px-4 py-3 text-center ${
        phase.isFullMoonNight
          ? "border-red-400/50 bg-red-950/25"
          : daysLeft <= FULL_MOON_APPROACH_DAYS
            ? "border-amber-400/40 bg-amber-950/20"
            : "border-brass/30 bg-panel/50"
      }`}
    >
      <p
        className={`font-display text-2xl font-bold tabular-nums md:text-3xl ${
          phase.isFullMoonNight
            ? "text-red-200"
            : daysLeft <= FULL_MOON_APPROACH_DAYS
              ? "text-amber-200"
              : "text-brass-light"
        }`}
      >
        {phase.isFullMoonNight
          ? "Full moon tonight"
          : `${daysLeft} day${daysLeft === 1 ? "" : "s"} until full moon`}
      </p>
      <p className="mt-1 text-xs text-parchment-dark">
        {phase.isFullMoonNight ? "Selûne rides at her peak" : `Next full moon: ${nextFullHarptos.label}`}
      </p>
    </div>
  );
}

function TrackerSection({
  step,
  title,
  action,
  children,
  className = "",
}: {
  step?: number;
  title: string;
  action?: ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xs font-bold tracking-wider text-brass uppercase">
          {step != null ? (
            <>
              <span className="mr-1.5 text-brass-light tabular-nums">{step}.</span>
              {title}
            </>
          ) : (
            title
          )}
        </h3>
        {action}
      </div>
      {children}
    </section>
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
  infectedAbsoluteDay,
}: {
  year: number;
  monthIndex: number;
  todayAbsoluteDay: number;
  infectedAbsoluteDay: number;
}) {
  const month = HARPTOS_MONTHS[monthIndex];
  const days = useMemo(
    () => getMonthCalendarDays(year, monthIndex, todayAbsoluteDay, infectedAbsoluteDay),
    [year, monthIndex, todayAbsoluteDay, infectedAbsoluteDay],
  );

  const cellClass = (cell: (typeof days)[number]) => {
    if (cell.isToday && cell.isInfected) {
      return "border-arcane/70 bg-red-950/45 shadow-[0_0_12px_rgba(248,113,113,0.35)]";
    }
    if (cell.isInfected) {
      return "border-red-400/70 bg-red-950/40 shadow-[0_0_10px_rgba(248,113,113,0.25)]";
    }
    if (cell.isToday) {
      return "border-arcane/60 bg-arcane/15 shadow-[0_0_12px_rgba(0,229,255,0.2)]";
    }
    return "border-brass/15 bg-panel/40";
  };

  const dayNumClass = (cell: (typeof days)[number]) => {
    if (cell.isInfected) return "text-red-200";
    if (cell.isToday) return "text-arcane-light";
    return "text-brass-light";
  };

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
                    className={`flex flex-col items-center rounded border px-0.5 py-1.5 text-center sm:px-1 ${cellClass(cell)}`}
                    title={`${cell.dayOfMonth} ${month.name} — ${cell.phase}${
                      cell.isInfected ? " — infected" : ""
                    }${cell.isToday ? " — today" : ""}`}
                  >
                    <span className="text-sm leading-none sm:text-base" aria-hidden>
                      {cell.phaseSymbol}
                    </span>
                    <span
                      className={`mt-1 font-display text-sm font-semibold tabular-nums ${dayNumClass(cell)}`}
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

function CurseStatusPanel({
  effects,
  campaignDay,
  biteDay,
  timelineDay,
  biteTimelineDay,
  firstFullMoonAfterBite,
  phase,
  sinceFull,
  lastFullHarptos,
  nextFullHarptos,
}: {
  effects: ReturnType<typeof getLycanthropyEffects>;
  campaignDay: number;
  biteDay: number;
  timelineDay: number;
  biteTimelineDay: number;
  firstFullMoonAfterBite: number;
  phase: ReturnType<typeof getLunarPhaseInfo>;
  sinceFull: number;
  lastFullHarptos: ReturnType<typeof absoluteDayToHarptos>;
  nextFullHarptos: ReturnType<typeof absoluteDayToHarptos>;
}) {
  const lunarStats = (
    <dl className="grid gap-x-3 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-1">
      <div className="flex justify-between gap-3 lg:flex-col lg:justify-start">
        <dt className="text-parchment-dark">Lunar cycle day</dt>
        <dd className="font-semibold text-brass-light tabular-nums">
          {phase.dayInCycle} / {LUNAR_CYCLE_DAYS}
        </dd>
      </div>
      <div className="flex justify-between gap-3 lg:flex-col lg:justify-start">
        <dt className="text-parchment-dark">Phase</dt>
        <dd className="font-semibold text-brass-light">
          {moonPhaseSymbol(phase.phase)} {phase.phaseLabel}
        </dd>
      </div>
      <div className="flex justify-between gap-3 lg:flex-col lg:justify-start">
        <dt className="text-parchment-dark">Since last full moon</dt>
        <dd className="font-semibold text-brass-light tabular-nums">
          {sinceFull === 0 ? "Tonight" : `${sinceFull} day${sinceFull === 1 ? "" : "s"}`}
        </dd>
      </div>
      <div className="flex justify-between gap-3 lg:flex-col lg:justify-start">
        <dt className="text-parchment-dark">Until next full moon</dt>
        <dd className="font-semibold text-brass-light tabular-nums">
          {phase.isFullMoonNight
            ? "Tonight"
            : `${phase.daysUntilFullMoon} day${phase.daysUntilFullMoon === 1 ? "" : "s"}`}
        </dd>
      </div>
    </dl>
  );

  const incubating =
    campaignDay >= biteDay && timelineDay < firstFullMoonAfterBite && timelineDay >= biteTimelineDay;
  const beforeBite = timelineDay < biteTimelineDay;
  const approachingFullMoon =
    !phase.isFullMoonNight &&
    phase.daysUntilFullMoon > 0 &&
    phase.daysUntilFullMoon <= FULL_MOON_APPROACH_DAYS;
  const isDormantCurse = effects?.heading === "Between Moons — Curse Dormant";

  const fullMoonApproachWarning = approachingFullMoon && isDormantCurse && (
    <div className="mb-3 rounded border border-amber-400/50 bg-amber-950/30 px-3 py-2 text-sm leading-relaxed text-amber-100">
      <p className="font-display text-xs font-bold tracking-wider text-amber-200 uppercase">
        Full Moon Approaching
      </p>
      <p className="mt-1">
        {phase.daysUntilFullMoon === 1
          ? "Tomorrow Selûne reaches her fullness — the afflicted should prepare for involuntary transformation."
          : `In ${phase.daysUntilFullMoon} days the moon turns full. Restless sleep, heightened urges, and fraying tempers are likely among the cursed.`}
      </p>
    </div>
  );

  if (effects) {
    return (
      <ArcanePanel className={SEVERITY_STYLES[effects.severity]}>
        <p className="mb-1 font-display text-xs font-bold tracking-wider text-brass uppercase">
          Curse Watch
        </p>
        {fullMoonApproachWarning}
        <h2 className="mb-2 font-display text-lg font-bold tracking-wider text-brass uppercase">
          {effects.heading}
        </h2>
        <p className="mb-3 text-sm leading-relaxed opacity-95">{effects.summary}</p>
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
        <p className="mt-3 border-t border-current/20 pt-2 text-xs text-parchment-dark/80">
          MM p.206–207 (5e)
        </p>
        <div className="mt-4 border-t border-current/20 pt-3">{lunarStats}</div>
        <p className="mt-3 text-xs text-parchment-dark/80">
          Last full moon: <span className="text-brass-light">{lastFullHarptos.label}</span>
          {" · "}
          Next: <span className="text-brass-light">{nextFullHarptos.label}</span>
        </p>
      </ArcanePanel>
    );
  }

  return (
    <ArcanePanel
      className={
        incubating
          ? "border-amber-400/30 bg-amber-950/15"
          : "border-brass/25 bg-panel/30"
      }
    >
      <p className="mb-1 font-display text-xs font-bold tracking-wider text-brass uppercase">
        Curse Watch
      </p>
      <h2 className="mb-2 font-display text-base font-bold tracking-wider text-brass-light uppercase">
        {beforeBite ? "Before the Bite" : incubating ? "Curse Incubating" : "No Active Effects"}
      </h2>
      <p className="text-sm leading-relaxed text-parchment-dark">
        {beforeBite
          ? "Today falls before the infection date — the wererat curse has not taken hold yet."
          : incubating
            ? `The curse stirs but Selûne has not yet demanded the first change. Effects begin on the first full moon after the bite (${absoluteDayToHarptos(firstFullMoonAfterBite).label}).`
            : "Adjust dates to see lycanthropy rules for the afflicted party."}
      </p>
      <div className="mt-4 border-t border-brass/20 pt-3">{lunarStats}</div>
      <p className="mt-3 text-xs text-parchment-dark">
        Last full moon: <span className="text-brass-light">{lastFullHarptos.label}</span>
        {" · "}
        Next: <span className="text-brass-light">{nextFullHarptos.label}</span>
      </p>
    </ArcanePanel>
  );
}

export default function MoonTracker({
  onBack,
  onLogout,
  loadMoonTracker,
  saveMoonTracker,
}: MoonTrackerProps) {
  const [epoch, setEpoch] = useState<CampaignEpoch>({ ...DEFAULT_CAMPAIGN_EPOCH });
  const [campaignDay, setCampaignDay] = useState(DEFAULT_CAMPAIGN_DAY);
  const [biteDay, setBiteDay] = useState(DEFAULT_BITE_DAY);
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const skipSave = useRef(true);

  const timelineDay = campaignDayToTimelineDay(campaignDay, epoch);
  const biteTimelineDay = campaignDayToTimelineDay(biteDay, epoch);
  const firstFullMoonAfterBite = nextFullMoonAbsoluteDay(biteTimelineDay);

  useEffect(() => {
    loadMoonTracker()
      .then((saved) => {
        if (saved) {
          setEpoch(saved.epoch);
          setCampaignDay(saved.campaignDay);
          setBiteDay(saved.biteDay);
          return;
        }

        setEpoch(loadCampaignEpoch());
        setCampaignDay(loadCampaignDay());
        setBiteDay(loadBiteDay());
      })
      .catch(() => {
        setEpoch(loadCampaignEpoch());
        setCampaignDay(loadCampaignDay());
        setBiteDay(loadBiteDay());
      })
      .finally(() => {
        skipSave.current = true;
        setHydrated(true);
      });
  }, [loadMoonTracker]);

  const moonSnapshot = useMemo(
    (): SavedMoonTracker => ({ epoch, campaignDay, biteDay }),
    [epoch, campaignDay, biteDay],
  );

  useEffect(() => {
    if (!hydrated) return;

    if (skipSave.current) {
      skipSave.current = false;
      return;
    }

    saveCampaignEpoch(epoch);
    saveCampaignDay(campaignDay);
    saveBiteDay(biteDay);

    setSaveStatus("saving");
    setSaveError(null);
    const timer = window.setTimeout(() => {
      saveMoonTracker(moonSnapshot).then((result) => {
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
  }, [moonSnapshot, hydrated, saveMoonTracker, epoch, campaignDay, biteDay]);

  const harptos = absoluteDayToHarptos(timelineDay);
  const biteHarptos = absoluteDayToHarptos(biteTimelineDay);
  const phase = getLunarPhaseInfo(timelineDay);
  const effects = getLycanthropyEffects(timelineDay, biteTimelineDay);
  const sinceFull = daysSinceLastFullMoon(timelineDay);
  const lastFullHarptos = absoluteDayToHarptos(lastFullMoonAbsoluteDay(timelineDay));
  const nextFullHarptos = absoluteDayToHarptos(nextFullMoonAbsoluteDay(timelineDay));

  const displayMonthIndex = harptos.monthIndex ?? 0;

  const setCurrentDate = (year: number, monthIndex: number, dayOfMonth: number) => {
    const timeline = harptosToTimelineDay(year, monthIndex, dayOfMonth);
    setCampaignDay(Math.max(1, timelineDayToCampaignDay(timeline, epoch)));
  };

  const setInfectedDate = (year: number, monthIndex: number, dayOfMonth: number) => {
    const timeline = harptosToTimelineDay(year, monthIndex, dayOfMonth);
    setBiteDay(Math.max(1, timelineDayToCampaignDay(timeline, epoch)));
  };

  const infectedMonthIndex = biteHarptos.monthIndex ?? 0;
  const infectedDayOfMonth = biteHarptos.dayOfMonth ?? 1;

  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Dates saved"
        : saveStatus === "error"
          ? saveError ?? "Save failed"
          : hydrated
            ? "Autosave on"
            : "Loading…";

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ArcaneBackdrop />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6">
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
            <span
              className={`rounded border px-2 py-1 ${
                saveStatus === "error"
                  ? "border-red-400/50 text-red-200"
                  : saveStatus === "saved"
                    ? "border-arcane/40 text-arcane-light"
                    : "border-brass/30 text-parchment-dark"
              }`}
            >
              {saveLabel}
            </span>
            <button type="button" onClick={onLogout} className={arcaneButtonGhostClass}>
              Lock vault
            </button>
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-[1fr_min(20rem,36%)] lg:items-start lg:gap-4">
          <ArcanePanel className="order-2 min-w-0 lg:order-1">
            <div className="flex flex-wrap items-center gap-4 border-b border-brass/20 pb-4">
              <p className="text-4xl" aria-hidden>
                {moonPhaseSymbol(phase.phase)}
              </p>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold text-brass-light">
                  {harptos.label}
                  {!harptos.festival && `, DR ${harptos.year}`}
                </p>
                <p className="text-sm text-parchment-dark">
                  {moonPhaseSymbol(phase.phase)} {phase.phaseLabel} · Campaign day {campaignDay}
                </p>
              </div>
            </div>

            <FullMoonCountdown phase={phase} nextFullHarptos={nextFullHarptos} />

            <p className="mt-3 text-sm leading-relaxed text-parchment-dark">
              {SITE_COPY.moonTrackerIntro}
            </p>

            <div className="mt-4 space-y-4">
              <TrackerSection
                step={1}
                title="Campaign Day 1"
                action={
                  <button
                    type="button"
                    onClick={() => setEpoch(randomCampaignEpoch())}
                    className={`${arcaneButtonGhostClass} px-2 py-1 text-xs`}
                  >
                    Randomize
                  </button>
                }
              >
                <p className="text-xs leading-relaxed text-parchment-dark">
                  {SITE_COPY.moonTrackerEpochBlurb}
                </p>
                <HarptosDateFields
                  year={epoch.year}
                  monthIndex={epoch.monthIndex}
                  dayOfMonth={epoch.dayOfMonth}
                  onChange={(next) => setEpoch(next)}
                />
              </TrackerSection>

              <div className="grid gap-4 md:grid-cols-2">
                <TrackerSection step={2} title="Today">
                  <p className="text-xs leading-relaxed text-parchment-dark">
                    {SITE_COPY.moonTrackerTodayBlurb}
                  </p>
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
                    <p className="text-xs text-parchment-dark">
                      {harptos.label} — intercalary festival, not on the tenday calendar.
                    </p>
                  )}
                </TrackerSection>

                <TrackerSection step={3} title="Day Infected">
                  <p className="text-xs leading-relaxed text-parchment-dark">
                    {SITE_COPY.moonTrackerInfectedBlurb}
                  </p>
                  {!biteHarptos.festival ? (
                    <HarptosDateFields
                      year={biteHarptos.year}
                      monthIndex={infectedMonthIndex}
                      dayOfMonth={infectedDayOfMonth}
                      onChange={({ year, monthIndex, dayOfMonth }) =>
                        setInfectedDate(year, monthIndex, dayOfMonth)
                      }
                    />
                  ) : (
                    <p className="text-xs text-parchment-dark">
                      {biteHarptos.label} — festival date.
                    </p>
                  )}
                  <p className="text-xs text-red-200/90">
                    {biteHarptos.label}
                    {biteHarptos.festival ? "" : `, DR ${biteHarptos.year}`}
                    {" · "}
                    Day {biteDay}
                  </p>
                </TrackerSection>
              </div>
            </div>

            <div className="mt-4 border-t border-brass/20 pt-4">
              {harptos.festival ? (
                <>
                  <h2 className="mb-2 font-display text-sm font-bold tracking-wider text-brass uppercase">
                    {harptos.festival}
                  </h2>
                  <p className="text-xs text-parchment-dark">
                    Intercalary festival — not part of any tenday. Selûne still follows the{" "}
                    {LUNAR_CYCLE_DAYS}-day cycle.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-3 font-display text-sm font-bold tracking-wider text-brass uppercase">
                    Lunar Calendar
                  </h2>
                  <HarptosMonthGrid
                    year={harptos.year}
                    monthIndex={displayMonthIndex}
                    todayAbsoluteDay={timelineDay}
                    infectedAbsoluteDay={biteTimelineDay}
                  />
                  <p className="mt-3 text-center text-xs leading-relaxed text-parchment-dark">
                    Selûne&apos;s {LUNAR_CYCLE_DAYS}-day cycle.
                    <span className="text-arcane-light"> Cyan</span> = today,
                    <span className="text-red-300"> red</span> = infected.
                  </p>
                </>
              )}
            </div>
          </ArcanePanel>

          <div className="order-1 mt-0 space-y-4 lg:order-2 lg:sticky lg:top-4 lg:mt-0 lg:self-start">
            <CurseStatusPanel
              effects={effects}
              campaignDay={campaignDay}
              biteDay={biteDay}
              timelineDay={timelineDay}
              biteTimelineDay={biteTimelineDay}
              firstFullMoonAfterBite={firstFullMoonAfterBite}
              phase={phase}
              sinceFull={sinceFull}
              lastFullHarptos={lastFullHarptos}
              nextFullHarptos={nextFullHarptos}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
