import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "ledger_auth";
const SESSION_DAYS = 30;

export function getAuthSecret(): string {
  return process.env.LEDGER_AUTH_SECRET || process.env.LEDGER_PASSWORD || "dev-insecure-secret";
}

export function getPassword(): string {
  const password = process.env.LEDGER_PASSWORD;
  if (!password) {
    throw new Error("LEDGER_PASSWORD is not configured");
  }
  return password.trim().toLowerCase();
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const expStr = String(exp);
  const sig = createHmac("sha256", getAuthSecret()).update(expStr).digest("hex");
  return `${expStr}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const expected = createHmac("sha256", getAuthSecret()).update(expStr).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function parseCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function sessionCookieHeader(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isAuthenticated(cookieHeader: string | undefined): boolean {
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  return token ? verifySessionToken(token) : false;
}

export function jsonResponse(statusCode: number, body: unknown, extraHeaders?: Record<string, string>) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export function unauthorized() {
  return jsonResponse(401, { error: "Unauthorized" });
}
