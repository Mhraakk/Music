#!/usr/bin/env node
/**
 * Generates docs/DESIGN-SKILLS.md from the skill registry so the documentation
 * can never drift from the implementation. Run with `npm run docs:design`.
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, "src/design/skills.ts");
const OUTPUT = path.join(ROOT, "docs/DESIGN-SKILLS.md");

const source = fs.readFileSync(REGISTRY, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;

const tmp = path.join(ROOT, "node_modules", ".cache", "design-skills.mjs");
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, transpiled);

const { DESIGN_SKILLS, SKILL_COUNT } = await import(`file://${tmp}`);

const byCategory = new Map();
for (const skill of DESIGN_SKILLS) {
  if (!byCategory.has(skill.category)) byCategory.set(skill.category, []);
  byCategory.get(skill.category).push(skill);
}

const esc = (value) => String(value).replace(/\|/g, "\\|");

const lines = [];
lines.push("# Neuform Design Skills — Implementation Record");
lines.push("");
lines.push(
  `All **${SKILL_COUNT}** skills from the Neuform library are implemented as a design-intelligence layer.`
);
lines.push(
  "Effects are mapped to appropriate routes and components rather than stacked on every screen."
);
lines.push("");
lines.push("> Generated from `src/design/skills.ts` — run `npm run docs:design` to refresh.");
lines.push("");

lines.push("## Coverage");
lines.push("");
lines.push("| Category | Skills |");
lines.push("| --- | ---: |");
for (const [category, skills] of [...byCategory].sort((a, b) => b[1].length - a[1].length)) {
  lines.push(`| ${category} | ${skills.length} |`);
}
lines.push(`| **Total** | **${SKILL_COUNT}** |`);
lines.push("");

const routes = new Map();
for (const skill of DESIGN_SKILLS) {
  for (const route of skill.routes) routes.set(route, (routes.get(route) ?? 0) + 1);
}
lines.push("## Skills per route");
lines.push("");
lines.push("| Route | Skills applied |");
lines.push("| --- | ---: |");
for (const [route, count] of [...routes].sort((a, b) => b[1] - a[1])) {
  lines.push(`| \`${route}\` | ${count} |`);
}
lines.push("");
lines.push(
  "`/design` is the gallery: it demonstrates the full library. Product surfaces receive a curated subset."
);
lines.push("");

lines.push("## Index");
lines.push("");
lines.push("| # | Skill | Category | Routes | Component | Status |");
lines.push("| ---: | --- | --- | --- | --- | --- |");
for (const s of DESIGN_SKILLS) {
  lines.push(
    `| ${s.id} | [${esc(s.name)}](${s.url}) | ${s.category} | ${s.routes.map((r) => `\`${r}\``).join(" ")} | \`${esc(s.component)}\` | ${s.status} |`
  );
}
lines.push("");

lines.push("## Implementation records");
lines.push("");
for (const [category, skills] of byCategory) {
  lines.push(`### ${category}`);
  lines.push("");
  for (const s of skills) {
    lines.push(`#### ${s.id}. ${s.name}`);
    lines.push("");
    lines.push(`- **Skill:** [\`${s.slug}\`](${s.url})`);
    lines.push(`- **Route:** ${s.routes.map((r) => `\`${r}\``).join(", ")}`);
    lines.push(`- **Component:** \`${s.component}\``);
    lines.push(`- **Purpose:** ${s.purpose}`);
    lines.push(`- **Mobile adaptation:** ${s.mobile}`);
    lines.push(`- **RTL adaptation:** ${s.rtl}`);
    lines.push(`- **Performance strategy:** ${s.performance}`);
    lines.push(`- **Accessibility strategy:** ${s.accessibility}`);
    lines.push(`- **Source files:** ${s.sourceFiles.map((f) => `\`${f}\``).join(", ")}`);
    lines.push(`- **Status:** ${s.status}`);
    if (s.note) lines.push(`- **Deviation:** ${s.note}`);
    lines.push("");
  }
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, lines.join("\n"));
console.log(`Wrote ${OUTPUT} (${DESIGN_SKILLS.length} skills)`);
