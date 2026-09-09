import type { ConverseMessage, ConverseResult, ConverseSession, ConverseStatus } from "./types";

const KEY_HEADER = "x-gemini-key";

export async function fetchConverseStatus(): Promise<ConverseStatus> {
  const response = await fetch("/api/converse", { method: "GET" });
  if (!response.ok) {
    return {
      configured: false,
      acceptsClientKey: true,
      model: null,
      rooms: [],
      note: "Ask is unreachable right now.",
    };
  }
  return (await response.json()) as ConverseStatus;
}

export async function sendConverseTurn(input: {
  messages: ConverseMessage[];
  session: ConverseSession;
  apiKey?: string | null;
}): Promise<ConverseResult | { ok: false; error: string }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const key = input.apiKey?.trim();
  if (key) headers[KEY_HEADER] = key;

  const response = await fetch("/api/converse", {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: input.messages,
      session: input.session,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | ConverseResult
    | { ok: false; error?: string }
    | null;

  if (!payload || typeof payload !== "object") {
    return { ok: false, error: `Ask returned ${response.status}.` };
  }
  if (!("ok" in payload) || payload.ok !== true) {
    return { ok: false, error: ("error" in payload && payload.error) || `Ask returned ${response.status}.` };
  }
  return payload;
}
