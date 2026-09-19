/**
 * Structured application logger.
 *
 * - Emits single-line JSON in production (machine-parseable for log drains).
 * - Emits readable, prefixed output in development.
 * - Level-gated via LOG_LEVEL (defaults: debug in dev, info in prod).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isProd = process.env.NODE_ENV === "production";

function activeLevel(): LogLevel {
  const configured = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (configured in LEVEL_WEIGHT) return configured as LogLevel;
  return isProd ? "info" : "debug";
}

type Fields = Record<string, unknown>;

function emit(level: LogLevel, event: string, fields?: Fields) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[activeLevel()]) return;

  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };

  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (isProd) {
    sink(JSON.stringify(record));
  } else {
    sink(`[RESONANT:${level}]`, event, fields ?? "");
  }
}

export const logger = {
  debug: (event: string, fields?: Fields) => emit("debug", event, fields),
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};

export type Logger = typeof logger;
