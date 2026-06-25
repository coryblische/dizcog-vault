import type { SavedLedger } from "./types";

const API = "/api";

function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

async function readJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function apiError(res: Response, data: { error?: string } | null): string {
  if (res.status === 404) {
    return `Vault API missing on this URL — deploy with the Node server (${siteOrigin() || "see README"})`;
  }
  if (data?.error) return data.error;
  if (res.status >= 500) return "Ledger vault server error — try again shortly";
  return `Could not reach ledger vault (HTTP ${res.status})`;
}

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/auth`, { credentials: "include" });
    if (!res.ok) return false;
    const data = await readJson<{ authenticated: boolean }>(res);
    return data?.authenticated ?? false;
  } catch {
    return false;
  }
}

export async function login(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API}/auth`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await readJson<{ error?: string; ok?: boolean }>(res);
    if (res.ok && data?.ok !== false) return { ok: true };

    return { ok: false, error: apiError(res, data) };
  } catch {
    return {
      ok: false,
      error: `Could not reach ledger vault — confirm the server is running${siteOrigin() ? ` at ${siteOrigin()}` : ""}`,
    };
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API}/auth`, { method: "DELETE", credentials: "include" });
}

export async function loadLedger(): Promise<SavedLedger | null> {
  const res = await fetch(`${API}/ledger`, { credentials: "include" });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to load ledger");

  const data = await readJson<{ ledger: SavedLedger | null }>(res);
  return data?.ledger ?? null;
}

export async function saveLedger(ledger: SavedLedger): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${API}/ledger`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ledger }),
  });

  if (res.status === 401) return { ok: false, error: "Session expired — unlock vault again" };

  const data = await readJson<{ error?: string }>(res);
  if (!res.ok) return { ok: false, error: apiError(res, data) };

  return { ok: true };
}
