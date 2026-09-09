#!/usr/bin/env node
/**
 * Streamable HTTP MCP at 127.0.0.1:8800/mcp (tries 8801–8809).
 *
 * Cursor:
 *   { "mcpServers": { "nuclear": { "url": "http://127.0.0.1:8800/mcp" } } }
 *
 * POST is proxied to Next's /mcp (tool logic). GET SSE stays here because
 * Cursor's Streamable HTTP client opens a listener on the same URL.
 */

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const START = Number(process.env.NUCLEAR_MCP_PORT) || 8800;
const END = 8809;
const HOST = "127.0.0.1";
const BACKEND = (process.env.NUCLEAR_MCP_BACKEND || "http://127.0.0.1:3000/mcp").replace(/\/$/, "");

function applyMcpHeaders(res, sessionId) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id, MCP-Protocol-Version");
  res.setHeader("Mcp-Session-Id", sessionId);
  res.setHeader("MCP-Protocol-Version", "2025-06-18");
}

function sessionOf(req) {
  const existing = req.headers["mcp-session-id"];
  if (typeof existing === "string" && existing.trim()) return existing.trim();
  return randomUUID();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isInitialize(raw) {
  try {
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows.some((row) => row && row.method === "initialize");
  } catch {
    return false;
  }
}

async function alreadyBound(port) {
  try {
    const response = await fetch(`http://${HOST}:${port}/mcp`, { signal: AbortSignal.timeout(400) });
    const body = await response.json();
    return Boolean(body?.ok && body?.name === "resonant-nuclear");
  } catch {
    return false;
  }
}

function listen(port) {
  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";
    const sessionId = sessionOf(req);
    applyMcpHeaders(res, sessionId);

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
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
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
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: true,
          name: "resonant-nuclear",
          url: "http://127.0.0.1:8800/mcp",
          transport: "Streamable HTTP",
          note: 'Cursor: { "mcpServers": { "nuclear": { "url": "http://127.0.0.1:8800/mcp" } } }',
        })
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
      const notification = (() => {
        try {
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.id == null;
        } catch {
          return false;
        }
      })();

      const backend = await fetch(BACKEND, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-session-id": sessionId,
          "mcp-protocol-version": "2025-06-18",
        },
        body: raw || "{}",
      });

      const text = await backend.text();
      if (backend.status === 202 || (notification && !text)) {
        res.statusCode = 202;
        res.end();
        return;
      }
      res.statusCode = backend.status;
      res.setHeader("Content-Type", backend.headers.get("content-type") || "application/json");
      if (isInitialize(raw)) applyMcpHeaders(res, sessionId);
      res.end(text);
    } catch (error) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: `Nuclear MCP backend ${BACKEND} is not reachable. Start Resonant (next dev / next start). ${error}`,
          },
        })
      );
    }
  });

  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && port < END) listen(port + 1);
    else console.warn(`[nuclear-mcp] could not bind ${port}: ${err.message}`);
  });
  server.listen(port, HOST, () => {
    console.log(`[nuclear-mcp] http://${HOST}:${port}/mcp → ${BACKEND}`);
  });
}

if (await alreadyBound(START)) {
  console.log(`[nuclear-mcp] already running at http://${HOST}:${START}/mcp`);
} else {
  listen(START);
}
