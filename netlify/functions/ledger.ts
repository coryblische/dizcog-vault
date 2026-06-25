import { connectLambda, getStore } from "@netlify/blobs";
import type { Config, Handler } from "@netlify/functions";
import { isAuthenticated, jsonResponse, unauthorized } from "./_shared/auth";

const LEDGER_KEY = "main";
const STORE_NAME = "cogspanner-ledger";

export const config: Config = {
  path: "/api/ledger",
};

export const handler: Handler = async (event) => {
  const cookie = event.headers.cookie ?? event.headers.Cookie;

  if (!isAuthenticated(cookie)) {
    return unauthorized();
  }

  try {
    connectLambda(event);
    const store = getStore(STORE_NAME);

    if (event.httpMethod === "GET") {
      const ledger = await store.get(LEDGER_KEY, { type: "json" });
      return jsonResponse(200, { ledger: ledger ?? null });
    }

    if (event.httpMethod === "PUT") {
      const { ledger } = JSON.parse(event.body ?? "{}") as { ledger?: unknown };
      if (!ledger || typeof ledger !== "object") {
        return jsonResponse(400, { error: "Missing ledger payload" });
      }

      await store.setJSON(LEDGER_KEY, {
        ...(ledger as Record<string, unknown>),
        savedAt: new Date().toISOString(),
      });

      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Ledger function error:", error);
    const message = error instanceof Error ? error.message : "Storage error";
    return jsonResponse(500, { error: message });
  }
};
