/** Structured observability helper for RESONANT recommendation path */

export type LogLevel = "debug" | "info" | "warn" | "error";

export function logEvent(
  event: string,
  payload?: Record<string, unknown>,
  level: LogLevel = "info"
) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    level,
    ...(payload || {}),
  };
  const line = JSON.stringify(entry);
  if (typeof console === "undefined") return;
  if (level === "error") console.error("[RESONANT]", line);
  else if (level === "warn") console.warn("[RESONANT]", line);
  else if (level === "debug") {
    if (typeof window !== "undefined" && (window as any).__RESONANT_DEBUG__) {
      console.debug("[RESONANT]", line);
    }
  } else {
    console.info("[RESONANT]", line);
  }
}
