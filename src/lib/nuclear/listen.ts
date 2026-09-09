/**
 * Local Streamable HTTP MCP at 127.0.0.1:8800/mcp (tries 8801–8809).
 *
 * Same Cursor config as Nuclear desktop:
 *   { "mcpServers": { "nuclear": { "url": "http://127.0.0.1:8800/mcp" } } }
 *
 * Skipped on Vercel and during `next build`.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { handleNuclearRpc, isInitialize } from "./rpc";
import { NUCLEAR_SERVER_INFO } from "./mcp";

const START = 8800;
const END = 8809;
const HOST = "127.0.0.1";

function shouldSkip() {
  if (process.env.VERCEL) return true;
  if (process.env.NUCLEAR_MCP === "0") return true;
  if (process.env.NEXT_PHASE === "phase-production-build") return true;
  if (process.env.NEXT_PHASE === "phase-production-compile") return true;
  return false;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function cors(res: ServerResponse) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type, accept, mcp-session-id, mcp-protocol-version");
  res.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("access-control-expose-headers", "mcp-session-id");
}

function sessionOf(req: IncomingMessage, payload: unknown): string {
  const existing = req.headers["mcp-session-id"];
  if (typeof existing === "string" && existing.trim()) return existing.trim();
  if (isInitialize(payload) || Array.isArray(payload) && payload.some(isInitialize)) return randomUUID();
  return randomUUID();
}

function wantsSse(req: IncomingMessage): boolean {
  const accept = String(req.headers.accept ?? "");
  return accept.includes("text/event-stream") && !accept.includes("application/json");
}

function writeJson(res: ServerResponse, status: number, body: unknown, sessionId: string) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("mcp-session-id", sessionId);
  res.end(body === null ? "" : JSON.stringify(body));
}

function writeSse(res: ServerResponse, body: unknown, sessionId: string) {
  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream");
  res.setHeader("cache-control", "no-cache, no-transform");
  res.setHeader("connection", "keep-alive");
  res.setHeader("mcp-session-id", sessionId);
  res.write(`event: message\ndata: ${JSON.stringify(body)}\n\n`);
  res.end();
}

async function dispatch(payload: unknown) {
  if (Array.isArray(payload)) {
    const responses = await Promise.all(payload.map((item) => handleNuclearRpc(item)));
    return responses.filter((row) => row !== null);
  }
  return handleNuclearRpc(payload);
}

export function listenNuclearMcp() {
  if (shouldSkip()) return;
  if ((globalThis as { __resonantNuclearMcp?: boolean }).__resonantNuclearMcp) return;
  (globalThis as { __resonantNuclearMcp?: boolean }).__resonantNuclearMcp = true;

  const server = createServer(async (req, res) => {
    cors(res);
    const url = req.url ?? "/";
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (!url.split("?")[0].startsWith("/mcp")) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }

    if (req.method === "DELETE") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "GET") {
      const accept = String(req.headers.accept ?? "");
      if (accept.includes("text/event-stream")) {
        const sessionId = sessionOf(req, null);
        res.statusCode = 200;
        res.setHeader("content-type", "text/event-stream");
        res.setHeader("cache-control", "no-cache, no-transform");
        res.setHeader("connection", "keep-alive");
        res.setHeader("mcp-session-id", sessionId);
        res.write(": connected\n\n");
        const ping = setInterval(() => {
          if (res.writableEnded) {
            clearInterval(ping);
            return;
          }
          res.write(": ping\n\n");
        }, 15000);
        req.on("close", () => clearInterval(ping));
        return;
      }
      writeJson(
        res,
        200,
        {
          ok: true,
          name: NUCLEAR_SERVER_INFO.name,
          url: "http://127.0.0.1:8800/mcp",
          transport: "Streamable HTTP",
          note: 'Cursor: { "mcpServers": { "nuclear": { "url": "http://127.0.0.1:8800/mcp" } } }',
        },
        sessionOf(req, null)
      );
      return;
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end();
      return;
    }

    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw) as unknown;
      const sessionId = sessionOf(req, payload);
      const result = await dispatch(payload);
      if (result === null || (Array.isArray(result) && result.length === 0)) {
        res.statusCode = 202;
        res.setHeader("mcp-session-id", sessionId);
        res.end();
        return;
      }
      if (wantsSse(req)) writeSse(res, result, sessionId);
      else writeJson(res, 200, result, sessionId);
    } catch (error) {
      writeJson(
        res,
        400,
        { jsonrpc: "2.0", id: null, error: { code: -32700, message: String(error) } },
        sessionOf(req, null)
      );
    }
  });

  const tryPort = (port: number) => {
    const onError = (err: NodeJS.ErrnoException) => {
      server.off("error", onError);
      if (err.code === "EADDRINUSE" && port < END) tryPort(port + 1);
      else console.warn(`[nuclear-mcp] could not bind ${port}: ${err.message}`);
    };
    server.once("error", onError);
    server.listen(port, HOST, () => {
      server.off("error", onError);
      console.log(`[nuclear-mcp] http://${HOST}:${port}/mcp`);
    });
  };

  tryPort(Number(process.env.NUCLEAR_MCP_PORT) || START);
}
