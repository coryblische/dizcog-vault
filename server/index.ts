import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, request, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearSessionCookieHeader,
  createSessionToken,
  getPassword,
  isAuthenticated,
  sessionCookieHeader,
} from "./lib/auth.js";
import { readLedger, writeLedger } from "./lib/ledger-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const DEV_MODE = process.argv.includes("--dev");
const PORT = Number(process.env.PORT || 8888);
const VITE_PORT = Number(process.env.VITE_PORT || 5173);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
};

function sendJson(res: ServerResponse, status: number, body: unknown, headers?: Record<string, string>) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function handleAuth(req: IncomingMessage, res: ServerResponse) {
  const cookie = req.headers.cookie;

  if (req.method === "GET") {
    sendJson(res, 200, { authenticated: isAuthenticated(cookie) });
    return;
  }

  if (req.method === "POST") {
    try {
      const { password } = JSON.parse(await readBody(req)) as { password?: string };
      if (!password || password.trim().toLowerCase() !== getPassword()) {
        sendJson(res, 401, { error: "Invalid rune sequence" });
        return;
      }

      const token = createSessionToken();
      sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookieHeader(token, req) });
    } catch {
      sendJson(res, 500, { error: "Auth is not configured" });
    }
    return;
  }

  if (req.method === "DELETE") {
    sendJson(res, 200, { ok: true }, { "Set-Cookie": clearSessionCookieHeader(req) });
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

async function handleLedger(req: IncomingMessage, res: ServerResponse) {
  if (!isAuthenticated(req.headers.cookie)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  try {
    if (req.method === "GET") {
      const ledger = await readLedger();
      sendJson(res, 200, { ledger: ledger ?? null });
      return;
    }

    if (req.method === "PUT") {
      const { ledger } = JSON.parse(await readBody(req)) as { ledger?: unknown };
      if (!ledger || typeof ledger !== "object") {
        sendJson(res, 400, { error: "Missing ledger payload" });
        return;
      }

      await writeLedger(ledger as Record<string, unknown>);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Ledger error:", error);
    const message = error instanceof Error ? error.message : "Storage error";
    sendJson(res, 500, { error: message });
  }
}

function proxyToVite(req: IncomingMessage, res: ServerResponse) {
  const headers = { ...req.headers, host: `127.0.0.1:${VITE_PORT}` };
  const upstream = request(
    {
      hostname: "127.0.0.1",
      port: VITE_PORT,
      path: req.url,
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end("Vite dev server not running. Start it with: npm run dev:vite");
    }
  });

  req.pipe(upstream);
}

async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.normalize(path.join(DIST, pathname));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end("Forbidden");
    return true;
  }

  if (existsSync(filePath) && !filePath.endsWith(".html")) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    createReadStream(filePath).pipe(res);
    return true;
  }

  const indexPath = path.join(DIST, "index.html");
  if (existsSync(indexPath)) {
    const html = await readFile(indexPath, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return true;
  }

  return false;
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || "/";

  if (url === "/api/auth" || url.startsWith("/api/auth?")) {
    await handleAuth(req, res);
    return;
  }

  if (url === "/api/ledger" || url.startsWith("/api/ledger?")) {
    await handleLedger(req, res);
    return;
  }

  if (DEV_MODE) {
    proxyToVite(req, res);
    return;
  }

  const served = await serveStatic(req, res);
  if (!served) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Run npm run build first.");
  }
}

function startVite() {
  const child = spawn("npm", ["run", "dev:vite"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, VITE_PORT: String(VITE_PORT) },
  });
  child.on("exit", (code) => {
    if (code && code !== 0) process.exit(code);
  });
}

if (DEV_MODE) {
  startVite();
}

createServer(handleRequest).listen(PORT, () => {
  if (DEV_MODE) {
    console.log(`Dev vault: http://localhost:${PORT} (API + Vite proxy on :${VITE_PORT})`);
  } else {
    console.log(`Vault live: http://localhost:${PORT}`);
  }
});
