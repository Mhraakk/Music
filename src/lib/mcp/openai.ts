/**
 * OPENAI CLIENT — Ask companion
 *
 * Same contract as Gemini: function-calling loop owned by `lib/converse`,
 * keys never logged, listener-pasted key wins over the operator env key.
 */

import type { GeminiFunctionDeclaration, GeminiSchema } from "./gemini";
import { redactSecrets } from "./gemini";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const CONVERSE_TIMEOUT_MS = 22000;

export function envOpenAiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

export function openaiConfigured(): boolean {
  return Boolean(envOpenAiKey());
}

export function openaiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export function resolveOpenAiApiKey(override?: string | null): string | null {
  const fromHeader = typeof override === "string" ? override.trim() : "";
  if (fromHeader) return fromHeader;
  return envOpenAiKey();
}

export function looksLikeOpenAiKey(value: string): boolean {
  const t = value.trim();
  return t.startsWith("sk-") && t.length >= 20;
}

type OpenAiSchema = {
  type: "object" | "string" | "number" | "integer" | "boolean" | "array";
  description?: string;
  properties?: Record<string, OpenAiSchema>;
  items?: OpenAiSchema;
  required?: string[];
  enum?: string[];
};

function toOpenAiSchema(schema: GeminiSchema): OpenAiSchema {
  const type = schema.type.toLowerCase() as OpenAiSchema["type"];
  const out: OpenAiSchema = { type };
  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.enum;
  if (schema.required) out.required = schema.required;
  if (schema.properties) {
    out.properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      out.properties[key] = toOpenAiSchema(value);
    }
  }
  if (schema.items) out.items = toOpenAiSchema(schema.items);
  return out;
}

export function toOpenAiTools(tools: GeminiFunctionDeclaration[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: toOpenAiSchema(tool.parameters),
    },
  }));
}

export type OpenAiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};

export type OpenAiGenerateOutcome =
  | {
      ok: true;
      text: string;
      functionCalls: { name: string; args: Record<string, unknown>; id: string }[];
      assistantMessage: OpenAiMessage;
      model: string;
      latencyMs: number;
    }
  | { ok: false; reason: string; latencyMs: number };

export async function openaiGenerate(options: {
  system: string;
  messages: OpenAiMessage[];
  tools?: GeminiFunctionDeclaration[];
  toolChoice?: "auto" | "none";
  temperature?: number;
  timeoutMs?: number;
  apiKey?: string | null;
}): Promise<OpenAiGenerateOutcome> {
  const started = Date.now();
  const key = resolveOpenAiApiKey(options.apiKey);
  if (!key) {
    return { ok: false, reason: "OPENAI_API_KEY not configured", latencyMs: 0 };
  }

  const model = openaiModel();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? CONVERSE_TIMEOUT_MS);

  const body: Record<string, unknown> = {
    model,
    temperature: options.temperature ?? 0.4,
    messages: [{ role: "system", content: options.system }, ...options.messages],
  };

  if (options.tools?.length && options.toolChoice !== "none") {
    body.tools = toOpenAiTools(options.tools);
    body.tool_choice = "auto";
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - started;
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      return {
        ok: false,
        reason: redactSecrets(`openai http ${response.status}${errBody ? `: ${errBody.slice(0, 240)}` : ""}`),
        latencyMs,
      };
    }

    const payload = (await response.json()) as {
      model?: string;
      choices?: {
        finish_reason?: string;
        message?: {
          content?: string | null;
          tool_calls?: {
            id?: string;
            function?: { name?: string; arguments?: string };
          }[];
        };
      }[];
    };

    const message = payload.choices?.[0]?.message;
    const toolCalls = (message?.tool_calls ?? [])
      .filter((call) => call.function?.name)
      .map((call) => {
        let args: Record<string, unknown> = {};
        try {
          const parsed = JSON.parse(call.function?.arguments || "{}");
          if (parsed && typeof parsed === "object") args = parsed as Record<string, unknown>;
        } catch {
          args = {};
        }
        return {
          name: call.function!.name as string,
          args,
          id: call.id || `call_${call.function!.name}`,
        };
      });

    const text = (message?.content ?? "").trim();
    if (!text && toolCalls.length === 0) {
      return { ok: false, reason: "openai returned an empty candidate", latencyMs };
    }

    const assistantMessage: OpenAiMessage = {
      role: "assistant",
      content: text || null,
      tool_calls: toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.args) },
      })),
    };

    return {
      ok: true,
      text,
      functionCalls: toolCalls,
      assistantMessage,
      model: payload.model || model,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - started;
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `openai timed out after ${options.timeoutMs ?? CONVERSE_TIMEOUT_MS}ms`
        : error instanceof Error
          ? `openai transport error: ${error.message}`
          : "openai transport error";
    return { ok: false, reason: redactSecrets(reason), latencyMs };
  } finally {
    clearTimeout(timeout);
  }
}
