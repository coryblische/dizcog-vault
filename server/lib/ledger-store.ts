import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { githubConfigured, readRepoFile, writeRepoFile } from "./github-repo.js";
import { normalizeSavedLedger } from "./normalize-ledger.js";

const LEDGER_REPO_PATH = process.env.LEDGER_REPO_PATH || "content/ledger.json";
const GIT_WRITE_DEBOUNCE_MS = Number(process.env.GIT_WRITE_DEBOUNCE_MS || 15_000);

let cachedSha: string | undefined;
let pendingLedger: Record<string, unknown> | null = null;
let gitWriteTimer: ReturnType<typeof setTimeout> | null = null;
let gitWriteInFlight = false;

function localLedgerPath(): string {
  if (process.env.LEDGER_PATH) return process.env.LEDGER_PATH;
  if (process.env.DATA_DIR) return path.join(process.env.DATA_DIR, "main.json");
  return path.join(process.cwd(), LEDGER_REPO_PATH);
}

function formatLedger(ledger: Record<string, unknown>): Record<string, unknown> {
  return { ...ledger, savedAt: new Date().toISOString() };
}

function ledgerCommitMessage(ledger: Record<string, unknown>): string {
  const week = typeof ledger.week === "number" ? ledger.week : "?";
  const treasury = typeof ledger.treasuryGp === "number" ? ledger.treasuryGp.toFixed(0) : "?";
  return `chore(ledger): autosave week ${week} — ${treasury} gp`;
}

async function flushGitWrite(): Promise<void> {
  if (!pendingLedger || gitWriteInFlight || !githubConfigured()) return;

  const ledger = pendingLedger;
  pendingLedger = null;
  gitWriteInFlight = true;

  try {
    const body = `${JSON.stringify(ledger, null, 2)}\n`;
    cachedSha = await writeRepoFile(
      LEDGER_REPO_PATH,
      body,
      cachedSha,
      ledgerCommitMessage(ledger),
    );
  } finally {
    gitWriteInFlight = false;
    if (pendingLedger) {
      void flushGitWrite();
    }
  }
}

function scheduleGitWrite(ledger: Record<string, unknown>): void {
  pendingLedger = ledger;
  if (gitWriteTimer) return;
  gitWriteTimer = setTimeout(() => {
    gitWriteTimer = null;
    void flushGitWrite();
  }, GIT_WRITE_DEBOUNCE_MS);
}

export async function readLedger(): Promise<unknown | null> {
  if (githubConfigured()) {
    const file = await readRepoFile(LEDGER_REPO_PATH);
    if (!file) return null;
    cachedSha = file.sha;
    return normalizeSavedLedger(JSON.parse(file.content) as Record<string, unknown>);
  }

  try {
    const raw = await readFile(localLedgerPath(), "utf8");
    return normalizeSavedLedger(JSON.parse(raw) as Record<string, unknown>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeLedger(ledger: Record<string, unknown>): Promise<void> {
  const payload = formatLedger(normalizeSavedLedger(ledger));

  if (githubConfigured()) {
    scheduleGitWrite(payload);
    return;
  }

  const target = localLedgerPath();
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
