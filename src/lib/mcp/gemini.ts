/**
 * GEMINI CLIENT
 *
 * A thin, dependency-free client for the Generative Language API, used by the
 * cognitive core to reason about emotional structure.
 *
 * Two design rules:
 *
 *   1. NEVER LOAD-BEARING. If the key is absent, the network fails, the model
 *      times out or the JSON is malformed, the caller gets `null` and falls back
 *      to deterministic local cognition. The app must never be unusable because
 *      an inference provider is unusable.
 *   2. STRUCTURED ONLY. Responses are constrained by a response schema, so the
 *      caller parses a known shape rather than scraping prose.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 9000;

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

function apiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || null;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

/**
 * Gemini uses an OpenAPI-schema subset with uppercase type names, which is
 * close to but not the same as the JSON Schema used for MCP tool descriptors.
 */
export type GeminiSchema = {
  type: "OBJECT" | "STRING" | "NUMBER" | "INTEGER" | "BOOLEAN" | "ARRAY";
  description?: string;
  properties?: Record<string, GeminiSchema>;
  items?: GeminiSchema;
  required?: string[];
  enum?: string[];
  propertyOrdering?: string[];
  nullable?: boolean;
};

export type GeminiCallOptions = {
  system: string;
  prompt: string;
  schema: GeminiSchema;
  /** Low by default: this is a judgement task, not a creative writing task. */
  temperature?: number;
  timeoutMs?: number;
};

export type GeminiOutcome<T> =
  | { ok: true; value: T; model: string; latencyMs: number }
  | { ok: false; reason: string; latencyMs: number };

/**
 * Single non-streaming structured call. Returns a discriminated outcome rather
 * than throwing, because every caller's error path is "use local cognition".
 */
export async function geminiStructured<T>(options: GeminiCallOptions): Promise<GeminiOutcome<T>> {
  const started = Date.now();
  const key = apiKey();
  if (!key) {
    return { ok: false, reason: "GEMINI_API_KEY not configured", latencyMs: 0 };
  }

  const model = geminiModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.system }] },
        contents: [{ role: "user", parts: [{ text: options.prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.45,
          responseMimeType: "application/json",
          responseSchema: options.schema,
          candidateCount: 1,
        },
      }),
    });

    const latencyMs = Date.now() - started;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        reason: `gemini http ${response.status}${body ? `: ${body.slice(0, 240)}` : ""}`,
        latencyMs,
      };
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };

    if (payload.promptFeedback?.blockReason) {
      return { ok: false, reason: `gemini blocked: ${payload.promptFeedback.blockReason}`, latencyMs };
    }

    const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) {
      return { ok: false, reason: "gemini returned an empty candidate", latencyMs };
    }

    try {
      return { ok: true, value: JSON.parse(text) as T, model, latencyMs };
    } catch {
      return { ok: false, reason: "gemini returned unparseable JSON", latencyMs };
    }
  } catch (error) {
    const latencyMs = Date.now() - started;
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `gemini timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`
        : error instanceof Error
          ? `gemini transport error: ${error.message}`
          : "gemini transport error";
    return { ok: false, reason, latencyMs };
  } finally {
    clearTimeout(timeout);
  }
}
