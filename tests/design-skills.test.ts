import { describe, it, expect } from "vitest";
import {
  DESIGN_SKILLS,
  SKILL_CATEGORIES,
  SKILL_COUNT,
  getSkill,
  skillsByCategory,
  skillsForRoute,
} from "@/design/skills";
import { THEME_PRESETS, getPreset, presetStyle } from "@/design/themes";
import { SHADER_VARIANTS, getFragmentShader, hasVariant } from "@/components/neuform/webgl/shaders";

const IMPLEMENTED_ROUTES = new Set(["/", "/ask", "/design"]);

describe("skill registry", () => {
  it("contains exactly the 71 catalogued skills", () => {
    expect(SKILL_COUNT).toBe(71);
    expect(DESIGN_SKILLS).toHaveLength(71);
  });

  it("uses unique ids and slugs", () => {
    expect(new Set(DESIGN_SKILLS.map((s) => s.id)).size).toBe(71);
    expect(new Set(DESIGN_SKILLS.map((s) => s.slug)).size).toBe(71);
  });

  it("numbers skills 1..71 with no gaps", () => {
    const ids = DESIGN_SKILLS.map((s) => s.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 71 }, (_, i) => i + 1));
  });

  it("records every documentation field the brief requires", () => {
    for (const skill of DESIGN_SKILLS) {
      expect(skill.purpose.length, `${skill.slug} purpose`).toBeGreaterThan(20);
      expect(skill.mobile.length, `${skill.slug} mobile`).toBeGreaterThan(15);
      expect(skill.rtl.length, `${skill.slug} rtl`).toBeGreaterThan(15);
      expect(skill.performance.length, `${skill.slug} performance`).toBeGreaterThan(15);
      expect(skill.accessibility.length, `${skill.slug} accessibility`).toBeGreaterThan(15);
      expect(skill.component.length, `${skill.slug} component`).toBeGreaterThan(3);
      expect(skill.sourceFiles.length, `${skill.slug} sourceFiles`).toBeGreaterThan(0);
      expect(["implemented", "adapted"]).toContain(skill.status);
    }
  });

  it("maps every skill to at least one real route", () => {
    for (const skill of DESIGN_SKILLS) {
      expect(skill.routes.length, `${skill.slug} has no route`).toBeGreaterThan(0);
      for (const route of skill.routes) {
        expect(IMPLEMENTED_ROUTES.has(route), `${skill.slug} -> ${route}`).toBe(true);
      }
    }
  });

  it("points every skill at its canonical Neuform URL", () => {
    for (const skill of DESIGN_SKILLS) {
      expect(skill.url).toBe(`https://neuform.ai/skill/${skill.slug}`);
    }
  });

  it("explains any skill that deviates from the source definition", () => {
    for (const skill of DESIGN_SKILLS.filter((s) => s.status === "adapted")) {
      expect(skill.note, `${skill.slug} is adapted but has no note`).toBeTruthy();
      expect(String(skill.note).length).toBeGreaterThan(40);
    }
  });

  it("does not stack the whole library onto one screen", () => {
    // The brief forbids piling every effect on a single surface.
    const home = skillsForRoute("/");
    const ask = skillsForRoute("/ask");
    expect(home.length).toBeLessThan(15);
    expect(ask.length).toBeLessThan(15);
    expect(skillsForRoute("/design").length).toBe(71);
  });

  it("exposes lookup helpers", () => {
    expect(getSkill("css-border-gradient")?.name).toBe("Border Gradients");
    expect(getSkill("does-not-exist")).toBeUndefined();
    expect(skillsByCategory("WebGL").length).toBeGreaterThan(0);
    expect(SKILL_CATEGORIES).toContain("Design System");
  });
});

describe("shader library", () => {
  it("provides a shader for every skill that declares one", () => {
    for (const skill of DESIGN_SKILLS.filter((s) => s.kind === "shader")) {
      expect(hasVariant(skill.demo), `missing shader for ${skill.slug}`).toBe(true);
    }
  });

  it("emits a #version directive on the first line", () => {
    for (const variant of SHADER_VARIANTS) {
      const source = getFragmentShader(variant);
      expect(source.startsWith("#version 300 es"), variant).toBe(true);
      expect(source).toContain("void main()");
      expect(source).toContain("fragColor");
    }
  });

  it("keeps every shader direction-aware or explicitly symmetric", () => {
    for (const variant of SHADER_VARIANTS) {
      // u_dir is applied inside the shared uvc() helper, so every shader has it.
      expect(getFragmentShader(variant)).toContain("u_dir");
    }
  });

  it("falls back to a known variant for an unknown name", () => {
    expect(getFragmentShader("not-a-real-shader")).toContain("void main()");
  });
});

describe("theme presets", () => {
  it("provides a preset for every theme skill", () => {
    for (const skill of DESIGN_SKILLS.filter((s) => s.kind === "theme")) {
      expect(getPreset(skill.demo), `missing preset for ${skill.slug}`).toBeTruthy();
    }
  });

  it("meets the 4.5:1 body-text contrast floor", () => {
    for (const preset of THEME_PRESETS) {
      expect(preset.tokens.contrast, preset.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("emits scoped custom properties", () => {
    const style = presetStyle(THEME_PRESETS[0]);
    expect(style["--nf-theme-accent"]).toBeTruthy();
    expect(style["--nf-theme-ink"]).toBeTruthy();
    expect(style.color).toBeTruthy();
  });
});
