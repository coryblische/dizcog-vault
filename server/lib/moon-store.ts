import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { githubConfigured, readRepoFile, writeRepoFile } from "./github-repo.js";
import { normalizeSavedMoonTracker, type SavedMoonTracker } from "./normalize-moon-tracker.js";

export type { SavedMoonTracker };

const MOON_TRACKER_REPO_PATH = process.env.MOON_TRACKER_REPO_PATH || "content/moon-tracker.json";
const GIT_WRITE_DEBOUNCE_MS = Number(process.env.GIT_WRITE_DEBOUNCE_MS || 15_000);

let cachedSha: string | undefined;
let pendingMoon: SavedMoonTracker | null = null;
let gitWriteTimer: ReturnType<typeof setTimeout> | null = null;
let gitWriteInFlight = false;

function localMoonPath(): string {
  if (process.env.MOON_TRACKER_PATH) return process.env.MOON_TRACKER_PATH;
  if (process.env.DATA_DIR) return path.join(process.env.DATA_DIR, "moon-tracker.json");
  return path.join(process.cwd(), MOON_TRACKER_REPO_PATH);
}

function formatMoon(moon: SavedMoonTracker): SavedMoonTracker {
  return { ...moon, savedAt: new Date().toISOString() };
}

function moonCommitMessage(moon: SavedMoonTracker): string {
  const { year, monthIndex, dayOfMonth } = moon.epoch;
  const months = [
    "Hammer", "Alturiak", "Ches", "Tarsakh", "Mirtul", "Kythorn",
    "Flamerule", "Eleasias", "Eleint", "Marpenoth", "Uktar", "Nightal",
  ];
  const month = months[monthIndex] ?? "?";
  return `chore(moon): autosave today day ${moon.campaignDay} — ${dayOfMonth} ${month} ${year} DR`;
}

async function flushGitWrite(): Promise<void> {
  if (!pendingMoon || gitWriteInFlight || !githubConfigured()) return;

  const moon = pendingMoon;
  pendingMoon = null;
  gitWriteInFlight = true;

  try {
    const body = `${JSON.stringify(moon, null, 2)}\n`;
    cachedSha = await writeRepoFile(MOON_TRACKER_REPO_PATH, body, cachedSha, moonCommitMessage(moon));
  } finally {
    gitWriteInFlight = false;
    if (pendingMoon) {
      void flushGitWrite();
    }
  }
}

function scheduleGitWrite(moon: SavedMoonTracker): void {
  pendingMoon = moon;
  if (gitWriteTimer) return;
  gitWriteTimer = setTimeout(() => {
    gitWriteTimer = null;
    void flushGitWrite();
  }, GIT_WRITE_DEBOUNCE_MS);
}

export async function readMoonTracker(): Promise<SavedMoonTracker | null> {
  if (githubConfigured()) {
    const file = await readRepoFile(MOON_TRACKER_REPO_PATH);
    if (!file) return null;
    cachedSha = file.sha;
    return normalizeSavedMoonTracker(JSON.parse(file.content) as Record<string, unknown>);
  }

  try {
    const raw = await readFile(localMoonPath(), "utf8");
    return normalizeSavedMoonTracker(JSON.parse(raw) as Record<string, unknown>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeMoonTracker(moon: SavedMoonTracker): Promise<void> {
  const payload = formatMoon(normalizeSavedMoonTracker(moon as unknown as Record<string, unknown>));

  if (githubConfigured()) {
    scheduleGitWrite(payload);
    return;
  }

  const target = localMoonPath();
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
