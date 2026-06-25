import { getLunarPhaseInfo, moonPhaseSymbol, type LunarPhase } from "./moonLogic";

export const DAYS_PER_MONTH = 30;
export const DAYS_PER_YEAR = 365;
export const DEFAULT_EPOCH_YEAR = 1372;

export const HARPTOS_MONTHS = [
  { name: "Hammer", common: "Deepwinter" },
  { name: "Alturiak", common: "The Claw of Winter" },
  { name: "Ches", common: "The Claw of Sunsets" },
  { name: "Tarsakh", common: "The Claw of Storms" },
  { name: "Mirtul", common: "The Melting" },
  { name: "Kythorn", common: "The Time of Flowers" },
  { name: "Flamerule", common: "Summertide" },
  { name: "Eleasias", common: "Highsun" },
  { name: "Eleint", common: "The Fading" },
  { name: "Marpenoth", common: "Leafall" },
  { name: "Uktar", common: "The Rotting" },
  { name: "Nightal", common: "The Drawing Down" },
] as const;

type YearSegment =
  | { kind: "month"; monthIndex: number }
  | { kind: "festival"; name: string };

/** Calendar of Harptos — 12×30 days plus five intercalary festivals. */
export const YEAR_SEGMENTS: YearSegment[] = [
  { kind: "month", monthIndex: 0 },
  { kind: "festival", name: "Midwinter" },
  { kind: "month", monthIndex: 1 },
  { kind: "month", monthIndex: 2 },
  { kind: "month", monthIndex: 3 },
  { kind: "festival", name: "Greengrass" },
  { kind: "month", monthIndex: 4 },
  { kind: "month", monthIndex: 5 },
  { kind: "month", monthIndex: 6 },
  { kind: "festival", name: "Midsummer" },
  { kind: "month", monthIndex: 7 },
  { kind: "month", monthIndex: 8 },
  { kind: "festival", name: "Highharvestide" },
  { kind: "month", monthIndex: 9 },
  { kind: "month", monthIndex: 10 },
  { kind: "festival", name: "Feast of the Moon" },
  { kind: "month", monthIndex: 11 },
];

export interface HarptosDate {
  year: number;
  dayOfYear: number;
  label: string;
  monthIndex?: number;
  monthName?: string;
  monthCommon?: string;
  dayOfMonth?: number;
  festival?: string;
}

export interface MonthDayCell {
  dayOfMonth: number;
  absoluteDay: number;
  phase: LunarPhase;
  phaseSymbol: string;
  isToday: boolean;
}

function segmentLength(segment: YearSegment): number {
  return segment.kind === "month" ? DAYS_PER_MONTH : 1;
}

export function absoluteDayToHarptos(
  absoluteDay: number,
  epochYear = DEFAULT_EPOCH_YEAR,
): HarptosDate {
  const safeDay = Math.max(1, Math.floor(absoluteDay));
  const year = epochYear + Math.floor((safeDay - 1) / DAYS_PER_YEAR);
  const dayOfYear = ((safeDay - 1) % DAYS_PER_YEAR) + 1;
  let cursor = dayOfYear;

  for (const segment of YEAR_SEGMENTS) {
    const len = segmentLength(segment);
    if (cursor <= len) {
      if (segment.kind === "month") {
        const month = HARPTOS_MONTHS[segment.monthIndex];
        return {
          year,
          dayOfYear,
          monthIndex: segment.monthIndex,
          monthName: month.name,
          monthCommon: month.common,
          dayOfMonth: cursor,
          label: `${cursor} ${month.name}`,
        };
      }

      return {
        year,
        dayOfYear,
        festival: segment.name,
        label: segment.name,
      };
    }
    cursor -= len;
  }

  const month = HARPTOS_MONTHS[11];
  return {
    year,
    dayOfYear: DAYS_PER_YEAR,
    monthIndex: 11,
    monthName: month.name,
    monthCommon: month.common,
    dayOfMonth: DAYS_PER_MONTH,
    label: `${DAYS_PER_MONTH} ${month.name}`,
  };
}

export function harptosMonthStartAbsoluteDay(
  year: number,
  monthIndex: number,
  epochYear = DEFAULT_EPOCH_YEAR,
): number {
  const yearStart = (year - epochYear) * DAYS_PER_YEAR + 1;
  let offset = 0;

  for (const segment of YEAR_SEGMENTS) {
    if (segment.kind === "month") {
      if (segment.monthIndex === monthIndex) {
        return yearStart + offset;
      }
      offset += DAYS_PER_MONTH;
    } else {
      offset += 1;
    }
  }

  throw new Error(`Unknown Harptos month index: ${monthIndex}`);
}

export function getMonthCalendarDays(
  year: number,
  monthIndex: number,
  todayAbsoluteDay: number,
  epochYear = DEFAULT_EPOCH_YEAR,
): MonthDayCell[] {
  const startAbs = harptosMonthStartAbsoluteDay(year, monthIndex, epochYear);

  return Array.from({ length: DAYS_PER_MONTH }, (_, index) => {
    const dayOfMonth = index + 1;
    const absoluteDay = startAbs + index;
    const phase = getLunarPhaseInfo(absoluteDay).phase;

    return {
      dayOfMonth,
      absoluteDay,
      phase,
      phaseSymbol: moonPhaseSymbol(phase),
      isToday: absoluteDay === todayAbsoluteDay,
    };
  });
}

export function daysSinceLastFullMoon(absoluteDay: number): number {
  const rem = absoluteDay % 27;
  return rem === 0 ? 0 : rem;
}

export function nextFullMoonAbsoluteDay(absoluteDay: number): number {
  const rem = absoluteDay % 27;
  return rem === 0 ? absoluteDay : absoluteDay + (27 - rem);
}

export function lastFullMoonAbsoluteDay(absoluteDay: number): number {
  const since = daysSinceLastFullMoon(absoluteDay);
  return since === 0 ? absoluteDay : absoluteDay - since;
}
