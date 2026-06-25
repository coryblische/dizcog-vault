import {
  DEFAULT_BITE_DAY,
  DEFAULT_CAMPAIGN_DAY,
  DEFAULT_CAMPAIGN_EPOCH,
  DAYS_PER_MONTH,
  HARPTOS_MONTHS,
  type CampaignEpoch,
} from "../../src/faerunCalendar.ts";

export interface SavedMoonTracker {
  epoch: CampaignEpoch;
  campaignDay: number;
  biteDay: number;
  savedAt?: string;
}

function normalizeEpoch(raw: unknown): CampaignEpoch {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CAMPAIGN_EPOCH };

  const epoch = raw as Partial<CampaignEpoch>;
  const monthIndex =
    typeof epoch.monthIndex === "number" &&
    epoch.monthIndex >= 0 &&
    epoch.monthIndex < HARPTOS_MONTHS.length
      ? Math.floor(epoch.monthIndex)
      : DEFAULT_CAMPAIGN_EPOCH.monthIndex;

  return {
    year: Math.max(1, Math.floor(typeof epoch.year === "number" ? epoch.year : DEFAULT_CAMPAIGN_EPOCH.year)),
    monthIndex,
    dayOfMonth: Math.min(
      DAYS_PER_MONTH,
      Math.max(1, Math.floor(typeof epoch.dayOfMonth === "number" ? epoch.dayOfMonth : DEFAULT_CAMPAIGN_EPOCH.dayOfMonth)),
    ),
  };
}

function normalizeDay(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.max(1, Math.floor(raw));
}

export function normalizeSavedMoonTracker(raw: Record<string, unknown>): SavedMoonTracker {
  return {
    epoch: normalizeEpoch(raw.epoch),
    campaignDay: normalizeDay(raw.campaignDay, DEFAULT_CAMPAIGN_DAY),
    biteDay: normalizeDay(raw.biteDay, DEFAULT_BITE_DAY),
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : undefined,
  };
}
