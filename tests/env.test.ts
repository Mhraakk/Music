import { describe, it, expect } from "vitest";
import { env, hasLLM } from "@/lib/env";

describe("env", () => {
  it("parses NODE_ENV into a known value", () => {
    expect(["development", "test", "production"]).toContain(env.NODE_ENV);
  });

  it("defaults LOG_LEVEL to a valid level", () => {
    expect(["debug", "info", "warn", "error"]).toContain(env.LOG_LEVEL);
  });

  it("derives hasLLM from OPENAI_API_KEY presence", () => {
    expect(hasLLM).toBe(Boolean(env.OPENAI_API_KEY));
  });
});
