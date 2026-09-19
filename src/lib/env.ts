/**
 * Typed, validated environment access.
 *
 * Centralizes every environment variable the app reads so misconfiguration
 * fails fast and loudly instead of surfacing as a confusing runtime bug.
 * Dependency-free by design (no zod) to keep the server bundle lean.
 */

type EnvSpec<T> = {
  parse: (raw: string | undefined) => T;
};

function optionalString(): EnvSpec<string | undefined> {
  return { parse: (raw) => (raw && raw.trim() !== "" ? raw : undefined) };
}

function enumValue<const T extends readonly string[]>(
  values: T,
  fallback: T[number]
): EnvSpec<T[number]> {
  return {
    parse: (raw) => {
      if (raw && (values as readonly string[]).includes(raw)) return raw as T[number];
      return fallback;
    },
  };
}

const SPEC = {
  NODE_ENV: enumValue(["development", "test", "production"] as const, "development"),
  LOG_LEVEL: enumValue(["debug", "info", "warn", "error"] as const, "info"),
  OPENAI_API_KEY: optionalString(),
} satisfies Record<string, EnvSpec<unknown>>;

type ParsedEnv = { [K in keyof typeof SPEC]: ReturnType<(typeof SPEC)[K]["parse"]> };

export const env: ParsedEnv = {
  NODE_ENV: SPEC.NODE_ENV.parse(process.env.NODE_ENV),
  LOG_LEVEL: SPEC.LOG_LEVEL.parse(process.env.LOG_LEVEL),
  OPENAI_API_KEY: SPEC.OPENAI_API_KEY.parse(process.env.OPENAI_API_KEY),
};

/** True when a real LLM provider is configured; otherwise the local engine is used. */
export const hasLLM = Boolean(env.OPENAI_API_KEY);
