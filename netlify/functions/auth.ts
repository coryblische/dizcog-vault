import type { Config, Handler } from "@netlify/functions";
import {
  clearSessionCookieHeader,
  createSessionToken,
  getPassword,
  isAuthenticated,
  jsonResponse,
  sessionCookieHeader,
} from "./_shared/auth";

export const config: Config = {
  path: "/api/auth",
};

export const handler: Handler = async (event) => {
  const cookie = event.headers.cookie ?? event.headers.Cookie;

  if (event.httpMethod === "GET") {
    return jsonResponse(200, { authenticated: isAuthenticated(cookie) });
  }

  if (event.httpMethod === "POST") {
    try {
      const { password } = JSON.parse(event.body ?? "{}") as { password?: string };
      if (!password || password.trim().toLowerCase() !== getPassword()) {
        return jsonResponse(401, { error: "Invalid rune sequence" });
      }

      const token = createSessionToken();
      return jsonResponse(200, { ok: true }, { "Set-Cookie": sessionCookieHeader(token) });
    } catch {
      return jsonResponse(500, { error: "Auth is not configured" });
    }
  }

  if (event.httpMethod === "DELETE") {
    return jsonResponse(200, { ok: true }, { "Set-Cookie": clearSessionCookieHeader() });
  }

  return jsonResponse(405, { error: "Method not allowed" });
};
