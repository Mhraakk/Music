import { describe, it, expect } from "vitest";
import { planFromMessage, TOOL_CATALOG } from "@/lib/agent/intent";

describe("planFromMessage", () => {
  it("routes confirm to a confirmed export", () => {
    const plan = planFromMessage("confirm");
    expect(plan.intent).toBe("confirm_export");
    expect(plan.tools[0]).toEqual({ name: "confirmPlaylistExport", args: { confirmed: true } });
  });

  it("requires confirmation before exporting", () => {
    const plan = planFromMessage("export playlist");
    expect(plan.intent).toBe("export_playlist");
    expect(plan.tools[0].args).toMatchObject({ confirmed: false });
  });

  it("recognizes a recommendation request", () => {
    const plan = planFromMessage("recommend me something fresh");
    expect(plan.intent).toBe("recommend");
    expect(plan.tools.some((t) => t.name === "generateRecommendations")).toBe(true);
  });

  it("builds a journey", () => {
    const plan = planFromMessage("take me on a journey");
    expect(plan.intent).toBe("journey");
    expect(plan.tools[0].name).toBe("buildJourney");
  });

  it("routes compass refinements", () => {
    const plan = planFromMessage("make it darker and sadder");
    expect(plan.intent).toBe("refine");
    expect(plan.tools[0].name).toBe("refineRecommendations");
    expect(plan.tools[0].args).toMatchObject({ darker: true, sadder: true });
  });

  it("supports Persian recommendation phrasing", () => {
    const plan = planFromMessage("آهنگ جدید");
    expect(plan.tools.some((t) => t.name === "generateRecommendations")).toBe(true);
  });

  it("falls back to default recommendations for unknown input", () => {
    const plan = planFromMessage("hello there");
    expect(plan.intent).toBe("default_recommend");
    expect(plan.tools.length).toBeGreaterThan(0);
  });
});

describe("TOOL_CATALOG", () => {
  it("exposes uniquely-named tools", () => {
    const names = TOOL_CATALOG.map((t) => t.name);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });
});
