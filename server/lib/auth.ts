import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

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

export function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function useSecureCookies(req: IncomingMessage): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const forwarded = req.headers["x-forwarded-proto"];
  if (forwarded === "https") return true;
  return process.env.FORCE_SECURE_COOKIES === "1";
}

export function sessionCookieHeader(token: string, req: IncomingMessage): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const secure = useSecureCookies(req) ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearSessionCookieHeader(req: IncomingMessage): string {
  const secure = useSecureCookies(req) ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`;
}

export function isAuthenticated(cookieHeader: string | undefined): boolean {
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  return token ? verifySessionToken(token) : false;
}
