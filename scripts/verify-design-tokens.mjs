#!/usr/bin/env node
/**
 * Locks the Tidal black / cyan token trio (names stay; values are Tidal).
 */

import { readFileSync } from "node:fs";

const tokens = JSON.parse(readFileSync(new URL("../src/app/tokens.json", import.meta.url), "utf8"));
const theme = readFileSync(new URL("../src/app/theme.css", import.meta.url), "utf8");
const vars = readFileSync(new URL("../src/app/variables.css", import.meta.url), "utf8");

let failed = 0;

function has(file, label, needle) {
  if (!file.includes(needle)) {
    failed += 1;
    console.log(` FAIL  ${label} missing ${needle}`);
    return;
  }
  console.log(`  ok   ${label} ${needle}`);
}

for (const [name, token] of Object.entries(tokens.color)) {
  has(theme, "theme.css", `--color-${name}: ${token.$value}`);
  has(vars, "variables.css", `--color-${name}: ${token.$value}`);
}

for (const [name, token] of Object.entries(tokens.surface)) {
  has(vars, "variables.css", `--surface-${name}: ${token.$value}`);
}

has(vars, "variables.css", `--spacing-unit: ${tokens.spacing.unit.$value}`);
has(vars, "variables.css", `--radius-buttons: 0px`);
has(theme, "theme.css", `--text-display: ${tokens.typography.display.$value.fontSize}`);
has(vars, "variables.css", `--color-hot-pink: #121212`);
has(vars, "variables.css", `--font-weight-medium: 500`);
has(vars, "variables.css", `--page-max-width: 1200px`);

if (failed) {
  console.error(`\n${failed} token lock(s) failed`);
  process.exit(1);
}

console.log("\ntokens.json ↔ theme.css ↔ variables.css");
