#!/usr/bin/env node
/**
 * Start Nuclear MCP on :8800, then Next. Cursor:
 *   { "mcpServers": { "nuclear": { "url": "http://127.0.0.1:8800/mcp" } } }
 */
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
if (!args.length) {
  console.error("usage: node scripts/with-nuclear-mcp.mjs next dev");
  process.exit(1);
}

let port = process.env.PORT || "3000";
for (let i = 0; i < args.length; i += 1) {
  if ((args[i] === "-p" || args[i] === "--port") && args[i + 1]) port = args[i + 1];
  const matched = /^--port=(\d+)$/.exec(args[i]);
  if (matched) port = matched[1];
}

const mcp = spawn(process.execPath, [`${process.cwd()}/scripts/nuclear-mcp.mjs`], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
    NUCLEAR_MCP_BACKEND: process.env.NUCLEAR_MCP_BACKEND || `http://127.0.0.1:${port}/mcp`,
  },
});

const app = spawn("npx", args, {
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});

const stop = (code = 0) => {
  mcp.kill("SIGTERM");
  app.kill("SIGTERM");
  process.exit(code);
};

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
app.on("exit", (code) => {
  mcp.kill("SIGTERM");
  process.exit(code ?? 0);
});
mcp.on("exit", (code) => {
  if (code) console.warn(`[nuclear-mcp] exited ${code}`);
});
