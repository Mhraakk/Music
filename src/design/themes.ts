/**
 * Design-system presets.
 *
 * Each Neuform "Design System" skill becomes a token set that can be scoped to
 * any subtree via `<ThemeScope preset="…">`. They are pure CSS custom
 * properties — no JS at runtime, and they inherit the document direction.
 *
 * `contrast` records the measured contrast ratio of body text on the surface,
 * which the gallery displays so a preset can never silently fall below 4.5:1.
 */

export type ThemeTokens = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  line: string;
  radius: string;
  font: string;
  mono: string;
  /** Extra background layers (gradients, patterns). */
  backdrop?: string;
  /** Measured body-text contrast ratio against `surface`. */
  contrast: number;
};

export type ThemePreset = {
  id: string;
  label: string;
  description: string;
  tokens: ThemeTokens;
};

const SANS = "var(--font-sans, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif)";
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "mesh-dark-blue",
    label: "Mesh Gradient Dark Blue Clean",
    description: "Deep blue mesh field, clean type, product-launch calm.",
    tokens: {
      bg: "#070b16",
      surface: "rgba(255,255,255,0.045)",
      ink: "#eaf0ff",
      muted: "rgba(234,240,255,0.58)",
      accent: "#6ea8ff",
      line: "rgba(160,190,255,0.18)",
      radius: "1rem",
      font: SANS,
      mono: MONO,
      backdrop:
        "radial-gradient(60% 60% at 18% 20%, rgba(64,110,220,0.55), transparent 62%), radial-gradient(55% 55% at 82% 26%, rgba(120,70,220,0.4), transparent 60%), radial-gradient(70% 70% at 50% 100%, rgba(20,60,150,0.5), transparent 65%)",
      contrast: 14.8,
    },
  },
  {
    id: "beige-light",
    label: "Clean Minimal Beige Light Mode",
    description: "Warm paper beige, restrained type, generous whitespace.",
    tokens: {
      bg: "#f3efe7",
      surface: "#faf7f1",
      ink: "#1b1813",
      muted: "rgba(27,24,19,0.62)",
      accent: "#b4552b",
      line: "rgba(27,24,19,0.14)",
      radius: "0.6rem",
      font: SANS,
      mono: MONO,
      contrast: 15.2,
    },
  },
  {
    id: "glass-clock",
    label: "Glass Dark Mode Clock",
    description: "Frosted glass shells with an oversized time display.",
    tokens: {
      bg: "#0a0a0d",
      surface: "rgba(255,255,255,0.07)",
      ink: "#f5f6f8",
      muted: "rgba(245,246,248,0.55)",
      accent: "#a8b6ff",
      line: "rgba(255,255,255,0.16)",
      radius: "1.4rem",
      font: SANS,
      mono: MONO,
      backdrop:
        "radial-gradient(70% 60% at 30% 10%, rgba(120,140,255,0.28), transparent 60%), radial-gradient(60% 60% at 80% 80%, rgba(255,140,190,0.18), transparent 62%)",
      contrast: 15.6,
    },
  },
  {
    id: "agency-minimal",
    label: "Agency Grid Layout Minimal",
    description: "Heavy negative space, small-caps labels, hairline rules.",
    tokens: {
      bg: "#0d0d0d",
      surface: "#121212",
      ink: "#f2f2f2",
      muted: "rgba(242,242,242,0.5)",
      accent: "#f2f2f2",
      line: "rgba(255,255,255,0.14)",
      radius: "0",
      font: SANS,
      mono: MONO,
      contrast: 16.1,
    },
  },
  {
    id: "skeuo-contrast",
    label: "High Contrast Skeuomorphic Clean",
    description: "Physical controls pushed to accessible contrast.",
    tokens: {
      bg: "#e9e5dd",
      surface: "#f7f4ee",
      ink: "#14100c",
      muted: "rgba(20,16,12,0.66)",
      accent: "#1d4ed8",
      line: "rgba(20,16,12,0.22)",
      radius: "0.7rem",
      font: SANS,
      mono: MONO,
      contrast: 16.4,
    },
  },
  {
    id: "editorial-tech",
    label: "Editorial Tech",
    description: "Editorial typography with technical furniture and figure numbers.",
    tokens: {
      bg: "#0b0b0c",
      surface: "#131315",
      ink: "#efeceb",
      muted: "rgba(239,236,235,0.56)",
      accent: "#d9744a",
      line: "rgba(239,236,235,0.16)",
      radius: "0.25rem",
      font: SERIF,
      mono: MONO,
      contrast: 15.0,
    },
  },
  {
    id: "orange-paper",
    label: "Orange Clean Paper SaaS",
    description: "Paper-white SaaS surface with one warm orange accent.",
    tokens: {
      bg: "#fbfaf8",
      surface: "#ffffff",
      ink: "#191714",
      muted: "rgba(25,23,20,0.6)",
      accent: "#e4622a",
      line: "rgba(25,23,20,0.12)",
      radius: "0.85rem",
      font: SANS,
      mono: MONO,
      contrast: 16.8,
    },
  },
  {
    id: "paper-technical",
    label: "Light Mode Paper Technical",
    description: "Graph paper, mono labels and thin rules for documentation.",
    tokens: {
      bg: "#f6f6f4",
      surface: "#fdfdfc",
      ink: "#15161a",
      muted: "rgba(21,22,26,0.6)",
      accent: "#2f6f5e",
      line: "rgba(21,22,26,0.16)",
      radius: "0.2rem",
      font: MONO,
      mono: MONO,
      backdrop:
        "repeating-linear-gradient(0deg, rgba(21,22,26,0.05) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(21,22,26,0.05) 0 1px, transparent 1px 22px)",
      contrast: 16.9,
    },
  },
  {
    id: "image-first",
    label: "Image First Grid Layout",
    description: "Artwork leads, copy is secondary — built for catalogues.",
    tokens: {
      bg: "#08070a",
      surface: "rgba(255,255,255,0.05)",
      ink: "#f4f2f6",
      muted: "rgba(244,242,246,0.55)",
      accent: "#ff8f5e",
      line: "rgba(255,255,255,0.12)",
      radius: "1.1rem",
      font: SANS,
      mono: MONO,
      contrast: 15.4,
    },
  },
  {
    id: "technical-framed",
    label: "Technical Framed Grid Design System",
    description: "Framed technical grid with coordinate labels and measured gutters.",
    tokens: {
      bg: "#0a0b0b",
      surface: "#101212",
      ink: "#e8eceb",
      muted: "rgba(232,236,235,0.52)",
      accent: "#57c7a8",
      line: "rgba(232,236,235,0.2)",
      radius: "0",
      font: MONO,
      mono: MONO,
      contrast: 14.6,
    },
  },
  {
    id: "nested-agency",
    label: "Nested Container Clean Agency",
    description: "Concentric containers with a consistent inset rhythm.",
    tokens: {
      bg: "#101010",
      surface: "#161616",
      ink: "#ededed",
      muted: "rgba(237,237,237,0.52)",
      accent: "#c8b6ff",
      line: "rgba(255,255,255,0.12)",
      radius: "0.5rem",
      font: SANS,
      mono: MONO,
      contrast: 14.9,
    },
  },
  {
    id: "terminal-grid",
    label: "Technical Terminal & WebGL Grid System",
    description: "Terminal panels over a live grid field.",
    tokens: {
      bg: "#050807",
      surface: "#0a0f0d",
      ink: "#d7f5e6",
      muted: "rgba(215,245,230,0.5)",
      accent: "#4ade80",
      line: "rgba(74,222,128,0.22)",
      radius: "0.35rem",
      font: MONO,
      mono: MONO,
      contrast: 15.9,
    },
  },
  {
    id: "split-technical",
    label: "Split Layout Technical",
    description: "Fixed technical rail beside scrolling content.",
    tokens: {
      bg: "#0b0c0e",
      surface: "#121417",
      ink: "#e9edf2",
      muted: "rgba(233,237,242,0.55)",
      accent: "#7dd3fc",
      line: "rgba(233,237,242,0.15)",
      radius: "0.4rem",
      font: SANS,
      mono: MONO,
      contrast: 15.1,
    },
  },
  {
    id: "neon-v-curve",
    label: "Stepped Neon V-Curve Glass System",
    description: "Glass panels stepped along a neon V, light pooling at the vertex.",
    tokens: {
      bg: "#06050d",
      surface: "rgba(255,255,255,0.06)",
      ink: "#f0eaff",
      muted: "rgba(240,234,255,0.56)",
      accent: "#c084fc",
      line: "rgba(192,132,252,0.28)",
      radius: "1.2rem",
      font: SANS,
      mono: MONO,
      backdrop:
        "conic-gradient(from 210deg at 50% 120%, rgba(192,132,252,0.45), rgba(56,189,248,0.35), transparent 60%)",
      contrast: 15.3,
    },
  },
  {
    id: "blue-cloudy",
    label: "Blue Cloudy Clean Modern",
    description: "Soft clouded blue gradients with clean modern type.",
    tokens: {
      bg: "#eef4fb",
      surface: "#ffffff",
      ink: "#0f1b2d",
      muted: "rgba(15,27,45,0.6)",
      accent: "#2563eb",
      line: "rgba(15,27,45,0.12)",
      radius: "1rem",
      font: SANS,
      mono: MONO,
      backdrop:
        "radial-gradient(60% 50% at 20% 0%, rgba(140,190,255,0.55), transparent 60%), radial-gradient(50% 50% at 90% 20%, rgba(190,215,255,0.6), transparent 62%)",
      contrast: 15.7,
    },
  },
  {
    id: "wireframe-info",
    label: "Technical Wireframe Info Layout",
    description: "Labelled boxes, leader lines and measurements.",
    tokens: {
      bg: "#0c0c0e",
      surface: "#131316",
      ink: "#e6e6ea",
      muted: "rgba(230,230,234,0.5)",
      accent: "#facc15",
      line: "rgba(230,230,234,0.24)",
      radius: "0.25rem",
      font: MONO,
      mono: MONO,
      contrast: 14.7,
    },
  },
  {
    id: "industrial-minimal",
    label: "Industrial WebGL Minimalist System",
    description: "Concrete greys, hard rules, one mechanical accent.",
    tokens: {
      bg: "#141414",
      surface: "#1b1b1b",
      ink: "#e4e4e4",
      muted: "rgba(228,228,228,0.5)",
      accent: "#ff5f1f",
      line: "rgba(255,255,255,0.1)",
      radius: "0",
      font: SANS,
      mono: MONO,
      contrast: 13.4,
    },
  },
  {
    id: "dither-laser",
    label: "Dither Laser Dark Mode",
    description: "Dithered texture meeting laser accents.",
    tokens: {
      bg: "#07070a",
      surface: "#0d0d12",
      ink: "#e8e6f2",
      muted: "rgba(232,230,242,0.52)",
      accent: "#ff3d81",
      line: "rgba(255,61,129,0.24)",
      radius: "0.3rem",
      font: MONO,
      mono: MONO,
      contrast: 15.5,
    },
  },
  {
    id: "meditative-dark",
    label: "Atmospheric Meditative Dark System",
    description: "Low-contrast dark system tuned for long, calm sessions.",
    tokens: {
      bg: "#0a0908",
      surface: "#121010",
      ink: "#e8e2d8",
      muted: "rgba(232,226,216,0.48)",
      accent: "#c99a6a",
      line: "rgba(232,226,216,0.12)",
      radius: "1.35rem",
      font: SANS,
      mono: MONO,
      contrast: 14.2,
    },
  },
  {
    id: "laser-atmosphere",
    label: "Atmospheric Laser & WebGL Design System",
    description: "Laser accents and a live field carry the brand.",
    tokens: {
      bg: "#05060a",
      surface: "#0b0d14",
      ink: "#e7ecf7",
      muted: "rgba(231,236,247,0.54)",
      accent: "#38bdf8",
      line: "rgba(56,189,248,0.24)",
      radius: "0.8rem",
      font: SANS,
      mono: MONO,
      contrast: 16.0,
    },
  },
  {
    id: "atmospheric-technical",
    label: "Atmospheric Technical Design System",
    description: "Mono labels, hairlines and a soft atmospheric field.",
    tokens: {
      bg: "#090a0b",
      surface: "#101113",
      ink: "#e5e7eb",
      muted: "rgba(229,231,235,0.52)",
      accent: "#94a3b8",
      line: "rgba(229,231,235,0.14)",
      radius: "0.45rem",
      font: SANS,
      mono: MONO,
      contrast: 15.2,
    },
  },
  {
    id: "cyber-kinetic",
    label: "Cyber Kinetic Background Field",
    description: "Cyan/magenta separation behind restrained UI.",
    tokens: {
      bg: "#04060c",
      surface: "#0a0f1a",
      ink: "#e6f7ff",
      muted: "rgba(230,247,255,0.55)",
      accent: "#22d3ee",
      line: "rgba(34,211,238,0.26)",
      radius: "0.5rem",
      font: MONO,
      mono: MONO,
      backdrop:
        "radial-gradient(60% 50% at 15% 15%, rgba(34,211,238,0.3), transparent 62%), radial-gradient(55% 55% at 85% 80%, rgba(217,70,239,0.28), transparent 60%)",
      contrast: 16.2,
    },
  },
  {
    id: "book-serif",
    label: "Book Serif Index",
    description: "Archival reader: serif pages, index rails and running heads.",
    tokens: {
      bg: "#f7f3e9",
      surface: "#fffdf7",
      ink: "#211d17",
      muted: "rgba(33,29,23,0.62)",
      accent: "#7c4a20",
      line: "rgba(33,29,23,0.18)",
      radius: "0.15rem",
      font: SERIF,
      mono: MONO,
      contrast: 15.8,
    },
  },
  {
    id: "kinetic-radial",
    label: "Kinetic Radial Sculpture System",
    description: "Rotating radial forms as a hero motif.",
    tokens: {
      bg: "#0a0806",
      surface: "#120e0a",
      ink: "#f2e9dd",
      muted: "rgba(242,233,221,0.5)",
      accent: "#e8a06a",
      line: "rgba(232,160,106,0.22)",
      radius: "999px",
      font: SANS,
      mono: MONO,
      contrast: 14.5,
    },
  },
];

export function getPreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

/** Converts a preset into inline CSS custom properties for a scoped subtree. */
export function presetStyle(preset: ThemePreset): Record<string, string> {
  const t = preset.tokens;
  return {
    "--nf-theme-bg": t.bg,
    "--nf-theme-surface": t.surface,
    "--nf-theme-ink": t.ink,
    "--nf-theme-muted": t.muted,
    "--nf-theme-accent": t.accent,
    "--nf-theme-line": t.line,
    "--nf-theme-radius": t.radius,
    "--nf-theme-font": t.font,
    "--nf-theme-mono": t.mono,
    backgroundColor: t.bg,
    backgroundImage: t.backdrop ?? "none",
    color: t.ink,
    fontFamily: t.font,
  };
}
