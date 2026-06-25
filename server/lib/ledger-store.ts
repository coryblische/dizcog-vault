import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const LEDGER_KEY = "main";

function dataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

function ledgerPath(): string {
  return path.join(dataDir(), `${LEDGER_KEY}.json`);
}

export async function readLedger(): Promise<unknown | null> {
  try {
    const raw = await readFile(ledgerPath(), "utf8");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeLedger(ledger: Record<string, unknown>): Promise<void> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    ledgerPath(),
    JSON.stringify({ ...ledger, savedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
}
