/**
 * GEMINI CLIENT
 *
 * A thin, dependency-free client for the Generative Language API.
 *
 * Used in two modes:
 *
 *   1. STRUCTURED JSON — cognitive core (`geminiStructured`). Constrained by a
 *      response schema. Never load-bearing: timeout, missing key or malformed
 *      JSON all become `ok: false` and local cognition continues.
 *   2. FUNCTION CALLING — conversation (`geminiGenerate`). The model may call
 *      catalog/play tools; the loop lives in `lib/converse`, not here.
 *
 * Keys are never logged. The operator key lives in `GEMINI_API_KEY`. A listener
 * may also send their own key on a converse request; cognition drift never
 * uses that header — only the Ask companion does.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 9000;
const CONVERSE_TIMEOUT_MS = 18000;

export function envGeminiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || null;
}

export function geminiConfigured(): boolean {
  return Boolean(envGeminiKey());
}

/**
 * Header key wins when the listener pasted one in Ask; otherwise the operator
 * env key. Empty / whitespace is treated as absent. Never persist the result.
 */
export function resolveGeminiApiKey(override?: string | null): string | null {
  const fromHeader = typeof override === "string" ? override.trim() : "";
  if (fromHeader) return fromHeader;
  return envGeminiKey();
}

function apiKey(): string | null {
  return envGeminiKey();
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

/** Strip anything that looks like a Google API key from an error surface. */
export function redactSecrets(text: string): string {
  return text.replace(/AIza[0-9A-Za-z_-]{10,}/g, "[redacted]");
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
        reason: redactSecrets(
          `gemini http ${response.status}${body ? `: ${body.slice(0, 240)}` : ""}`
        ),
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

/* ────────────────────────── function-calling generate ────────────────────────── */

export type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; response: Record<string, unknown>; id?: string };
  thoughtSignature?: string;
};

export type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

export type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters: GeminiSchema;
};

export type GeminiGenerateOptions = {
  system: string;
  contents: GeminiContent[];
  tools?: GeminiFunctionDeclaration[];
  /** Force a prose reply (last round of a tool loop). */
  toolMode?: "AUTO" | "NONE" | "ANY";
  temperature?: number;
  timeoutMs?: number;
  /** Listener-pasted key, or omit to use the operator env key. */
  apiKey?: string | null;
};

export type GeminiGenerateOutcome =
  | {
      ok: true;
      text: string;
      parts: GeminiPart[];
      functionCalls: { name: string; args: Record<string, unknown>; id?: string }[];
      finishReason: string | null;
      model: string;
      latencyMs: number;
    }
  | { ok: false; reason: string; latencyMs: number };

/**
 * One generateContent call that may return function calls, prose, or both.
 * Callers own the tool loop. Never throws.
 */
export async function geminiGenerate(options: GeminiGenerateOptions): Promise<GeminiGenerateOutcome> {
  const started = Date.now();
  const key = resolveGeminiApiKey(options.apiKey);
  if (!key) {
    return { ok: false, reason: "GEMINI_API_KEY not configured", latencyMs: 0 };
  }

  const model = geminiModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? CONVERSE_TIMEOUT_MS);

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: options.system }] },
    contents: options.contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      candidateCount: 1,
    },
  };

  if (options.tools?.length) {
    body.tools = [{ functionDeclarations: options.tools }];
    body.toolConfig = {
      functionCallingConfig: { mode: options.toolMode ?? "AUTO" },
    };
  }

  try {
    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - started;

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      return {
        ok: false,
        reason: redactSecrets(
          `gemini http ${response.status}${errBody ? `: ${errBody.slice(0, 240)}` : ""}`
        ),
        latencyMs,
      };
    }

    const payload = (await response.json()) as {
      candidates?: {
        content?: { parts?: GeminiPart[] };
        finishReason?: string;
      }[];
      promptFeedback?: { blockReason?: string };
    };

    if (payload.promptFeedback?.blockReason) {
      return { ok: false, reason: `gemini blocked: ${payload.promptFeedback.blockReason}`, latencyMs };
    }

    const parts = payload.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = parts
      .map((part) => part.functionCall)
      .filter((call): call is { name: string; args?: Record<string, unknown>; id?: string } => Boolean(call?.name))
      .map((call) => ({
        name: call.name,
        args: call.args && typeof call.args === "object" ? call.args : {},
        id: call.id,
      }));

    const text = parts.map((part) => part.text ?? "").join("").trim();
    const finishReason = payload.candidates?.[0]?.finishReason ?? null;

    if (!text && functionCalls.length === 0) {
      return { ok: false, reason: "gemini returned an empty candidate", latencyMs };
    }

    return {
      ok: true,
      text,
      parts,
      functionCalls,
      finishReason,
      model,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - started;
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `gemini timed out after ${options.timeoutMs ?? CONVERSE_TIMEOUT_MS}ms`
        : error instanceof Error
          ? `gemini transport error: ${error.message}`
          : "gemini transport error";
    return { ok: false, reason: redactSecrets(reason), latencyMs };
  } finally {
    clearTimeout(timeout);
  }
}
