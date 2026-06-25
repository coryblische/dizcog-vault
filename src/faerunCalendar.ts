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

export interface CampaignEpoch {
  year: number;
  monthIndex: number;
  dayOfMonth: number;
}

export const DEFAULT_CAMPAIGN_EPOCH: CampaignEpoch = {
  year: 1492,
  monthIndex: 4,
  dayOfMonth: 1,
};

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
  isInfected: boolean;
}

function segmentLength(segment: YearSegment): number {
  return segment.kind === "month" ? DAYS_PER_MONTH : 1;
}

export function harptosToTimelineDay(
  year: number,
  monthIndex: number,
  dayOfMonth: number,
): number {
  const safeDay = Math.min(DAYS_PER_MONTH, Math.max(1, Math.floor(dayOfMonth)));
  return harptosMonthStartAbsoluteDay(year, monthIndex, DEFAULT_EPOCH_YEAR) + safeDay - 1;
}

export function campaignEpochToTimelineDay(epoch: CampaignEpoch): number {
  return harptosToTimelineDay(epoch.year, epoch.monthIndex, epoch.dayOfMonth);
}

export function timelineDayToCampaignDay(
  timelineDay: number,
  epoch: CampaignEpoch,
): number {
  return timelineDay - campaignEpochToTimelineDay(epoch) + 1;
}

export function campaignDayToTimelineDay(
  campaignDay: number,
  epoch: CampaignEpoch,
): number {
  return campaignEpochToTimelineDay(epoch) + Math.max(1, Math.floor(campaignDay)) - 1;
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
  infectedAbsoluteDay?: number,
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
      isInfected: infectedAbsoluteDay != null && absoluteDay === infectedAbsoluteDay,
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

export const LUNAR_DAY_STORAGE_KEY = "dizcog-lunar-day";
export const CAMPAIGN_DAY_STORAGE_KEY = "dizcog-campaign-day";
export const BITE_DAY_STORAGE_KEY = "dizcog-bite-day";
export const CAMPAIGN_EPOCH_STORAGE_KEY = "dizcog-campaign-epoch";
export const LUNAR_TIMELINE_FLAG_KEY = "dizcog-lunar-uses-timeline";

export const DEFAULT_CAMPAIGN_DAY = 21;
export const DEFAULT_BITE_DAY = 21;

/** Default "today" — 21 Mirtul 1492 DR (~three tendays into the BG3 year) */
export const DEFAULT_TIMELINE_DAY = campaignDayToTimelineDay(
  DEFAULT_CAMPAIGN_DAY,
  DEFAULT_CAMPAIGN_EPOCH,
);

export function loadCampaignEpoch(): CampaignEpoch {
  if (typeof window === "undefined") return { ...DEFAULT_CAMPAIGN_EPOCH };
  try {
    const raw = localStorage.getItem(CAMPAIGN_EPOCH_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CAMPAIGN_EPOCH };
    const parsed = JSON.parse(raw) as CampaignEpoch;
    if (
      typeof parsed.year === "number" &&
      typeof parsed.monthIndex === "number" &&
      typeof parsed.dayOfMonth === "number" &&
      parsed.monthIndex >= 0 &&
      parsed.monthIndex < HARPTOS_MONTHS.length
    ) {
      return {
        year: Math.floor(parsed.year),
        monthIndex: parsed.monthIndex,
        dayOfMonth: Math.min(DAYS_PER_MONTH, Math.max(1, Math.floor(parsed.dayOfMonth))),
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return { ...DEFAULT_CAMPAIGN_EPOCH };
}

export function saveCampaignEpoch(epoch: CampaignEpoch): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CAMPAIGN_EPOCH_STORAGE_KEY, JSON.stringify(epoch));
}

export function loadCampaignDay(epoch: CampaignEpoch = loadCampaignEpoch()): number {
  if (typeof window === "undefined") return DEFAULT_CAMPAIGN_DAY;

  const campaignRaw = localStorage.getItem(CAMPAIGN_DAY_STORAGE_KEY);
  if (campaignRaw) {
    const parsed = Number(campaignRaw);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return Math.floor(parsed);
    }
  }

  const timeline = loadTimelineDay(epoch);
  return Math.max(1, timelineDayToCampaignDay(timeline, epoch));
}

export function saveCampaignDay(campaignDay: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    CAMPAIGN_DAY_STORAGE_KEY,
    String(Math.max(1, Math.floor(campaignDay))),
  );
}

export function loadBiteDay(): number {
  if (typeof window === "undefined") return DEFAULT_BITE_DAY;

  const raw = localStorage.getItem(BITE_DAY_STORAGE_KEY);
  if (!raw) return DEFAULT_BITE_DAY;

  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.floor(parsed);
  }

  return DEFAULT_BITE_DAY;
}

export function saveBiteDay(biteDay: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BITE_DAY_STORAGE_KEY, String(Math.max(1, Math.floor(biteDay))));
}

/** Random Harptos date for campaign day 1 — typical post–Time of Troubles DR range. */
export function randomCampaignEpoch(
  yearMin = 1358,
  yearMax = 1494,
): CampaignEpoch {
  const year = yearMin + Math.floor(Math.random() * (yearMax - yearMin + 1));
  const monthIndex = Math.floor(Math.random() * HARPTOS_MONTHS.length);
  const dayOfMonth = 1 + Math.floor(Math.random() * DAYS_PER_MONTH);
  return { year, monthIndex, dayOfMonth };
}

export function loadTimelineDay(epoch: CampaignEpoch = loadCampaignEpoch()): number {
  if (typeof window === "undefined") return DEFAULT_TIMELINE_DAY;
  const raw = localStorage.getItem(LUNAR_DAY_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_TIMELINE_DAY;
  }

  const usesTimeline = localStorage.getItem(LUNAR_TIMELINE_FLAG_KEY) === "1";
  if (!usesTimeline) {
    return campaignDayToTimelineDay(Math.floor(parsed), epoch);
  }

  return Math.floor(parsed);
}

export function saveTimelineDay(timelineDay: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LUNAR_DAY_STORAGE_KEY, String(Math.max(1, Math.floor(timelineDay))));
  localStorage.setItem(LUNAR_TIMELINE_FLAG_KEY, "1");
}
