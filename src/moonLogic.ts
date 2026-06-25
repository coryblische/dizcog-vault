/** DM lunar calendar — 31-day cycle, full moon on day 31. */

export const LUNAR_CYCLE_DAYS = 31;
export const FULL_MOON_CYCLE_DAY = 31;
export const DEFAULT_LUNAR_DAY = 21;
export const INFECTED_PARTY_COUNT = 3;

export type LunarPhase =
  | "new"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

export interface LunarPhaseInfo {
  absoluteDay: number;
  dayInCycle: number;
  phase: LunarPhase;
  phaseLabel: string;
  daysUntilFullMoon: number;
  fullMoonsElapsed: number;
  isFullMoonNight: boolean;
}

export interface LycanthropyEffect {
  heading: string;
  severity: "warning" | "critical" | "aftermath";
  summary: string;
  rules: string[];
  partyNote: string;
}

export function dayInCycle(absoluteDay: number): number {
  if (absoluteDay <= 0) return 1;
  return ((absoluteDay - 1) % LUNAR_CYCLE_DAYS) + 1;
}

export function isFullMoonNight(absoluteDay: number): boolean {
  return absoluteDay > 0 && absoluteDay % LUNAR_CYCLE_DAYS === 0;
}

export function fullMoonsElapsed(absoluteDay: number): number {
  if (absoluteDay < FULL_MOON_CYCLE_DAY) return 0;
  return Math.floor(absoluteDay / LUNAR_CYCLE_DAYS);
}

export function daysUntilFullMoon(absoluteDay: number): number {
  const inCycle = dayInCycle(absoluteDay);
  if (inCycle === FULL_MOON_CYCLE_DAY) return 0;
  return FULL_MOON_CYCLE_DAY - inCycle;
}

export function getLunarPhaseInfo(absoluteDay: number): LunarPhaseInfo {
  const cycleDay = dayInCycle(absoluteDay);
  const fullMoon = isFullMoonNight(absoluteDay);

  let phase: LunarPhase;
  let phaseLabel: string;

  if (fullMoon) {
    phase = "full";
    phaseLabel = "Full Moon";
  } else if (cycleDay <= 2) {
    phase = "new";
    phaseLabel = "New Moon";
  } else if (cycleDay <= 7) {
    phase = "waxing-crescent";
    phaseLabel = "Waxing Crescent";
  } else if (cycleDay <= 11) {
    phase = "first-quarter";
    phaseLabel = "First Quarter";
  } else if (cycleDay <= 18) {
    phase = "waxing-gibbous";
    phaseLabel = "Waxing Gibbous";
  } else if (cycleDay <= 24) {
    phase = "waning-gibbous";
    phaseLabel = "Waning Gibbous";
  } else if (cycleDay <= 27) {
    phase = "last-quarter";
    phaseLabel = "Last Quarter";
  } else {
    phase = "waning-crescent";
    phaseLabel = "Waning Crescent";
  }

  return {
    absoluteDay,
    dayInCycle: cycleDay,
    phase,
    phaseLabel,
    daysUntilFullMoon: daysUntilFullMoon(absoluteDay),
    fullMoonsElapsed: fullMoonsElapsed(absoluteDay),
    isFullMoonNight: fullMoon,
  };
}

/** 5e MM lycanthropy — wererat curse, full-moon involuntary change. */
export function getLycanthropyEffects(absoluteDay: number): LycanthropyEffect | null {
  if (absoluteDay < FULL_MOON_CYCLE_DAY) return null;

  const phase = getLunarPhaseInfo(absoluteDay);
  const partyNote = `${INFECTED_PARTY_COUNT} party members carry wererat lycanthropy (failed DC 11 Con save on bite).`;

  if (phase.isFullMoonNight) {
    return {
      heading: `Full Moon — Night ${absoluteDay}`,
      severity: "critical",
      summary:
        "When the full moon rises, the curse becomes too strong to resist. Each afflicted character involuntarily transforms.",
      rules: [
        "Involuntary transformation into wererat hybrid form or giant rat form (MM p.206).",
        "Resisting the curse: retain normal alignment and personality only while in humanoid form — not during the change.",
        "Afflicted characters may not remember the night's events; bloody dreams are common afterward.",
        "The DM may assume control of afflicted PCs until the moon wanes.",
        "Wererat (if embracing curse): alignment shifts to lawful evil; gains shapechanger traits per MM sidebar.",
        "Damage immunity: nonmagical bludgeoning, piercing, and slashing (not silvered) while transformed.",
      ],
      partyNote,
    };
  }

  const cycleDay = phase.dayInCycle;
  const daysSinceFullMoon = cycleDay === 1 && absoluteDay > LUNAR_CYCLE_DAYS ? 1 : cycleDay;

  if (daysSinceFullMoon <= 3) {
    return {
      heading: "Waning Moon — Aftermath",
      severity: "aftermath",
      summary:
        "The moon wanes; the beast within can be controlled once again. The worst of the involuntary change has passed.",
      rules: [
        "Afflicted characters regain control in humanoid form.",
        "Fragmented memories or nightmares of the transformation may surface.",
        "Bestial urges remain buried but present — roleplay as desired.",
        "Next involuntary transformation: full moon in " +
          `${daysUntilFullMoon(absoluteDay)} day${daysUntilFullMoon(absoluteDay) === 1 ? "" : "s"} (day ${absoluteDay + daysUntilFullMoon(absoluteDay)}).`,
      ],
      partyNote,
    };
  }

  return {
    heading: "Between Moons — Curse Dormant",
    severity: "warning",
    summary:
      "Humanoid form holds. The curse stirs beneath the surface until the next full moon rises.",
    rules: [
      "Afflicted characters function normally in humanoid form while resisting the curse.",
      "Deep bestial urges may surface in roleplay but do not force a transformation yet.",
      `Next full moon in ${phase.daysUntilFullMoon} day${phase.daysUntilFullMoon === 1 ? "" : "s"} (day ${absoluteDay + phase.daysUntilFullMoon}).`,
      "Remove curse: remove curse or similar magic (MM p.207).",
      `${phase.fullMoonsElapsed} full moon${phase.fullMoonsElapsed === 1 ? "" : "s"} since tracking began.`,
    ],
    partyNote,
  };
}

export const LUNAR_DAY_STORAGE_KEY = "dizcog-lunar-day";

export function loadLunarDay(): number {
  if (typeof window === "undefined") return DEFAULT_LUNAR_DAY;
  const raw = localStorage.getItem(LUNAR_DAY_STORAGE_KEY);
  const parsed = raw ? Number(raw) : DEFAULT_LUNAR_DAY;
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : DEFAULT_LUNAR_DAY;
}

export function saveLunarDay(day: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LUNAR_DAY_STORAGE_KEY, String(day));
}
