/**
 * Neuform design-intelligence registry.
 *
 * All 71 skills are catalogued here with the implementation record required by
 * the brief: route, component, purpose, mobile adaptation, RTL adaptation,
 * performance strategy, accessibility strategy, source files and status.
 *
 * This file is the single source of truth: the `/design` gallery renders from
 * it and `docs/DESIGN-SKILLS.md` is generated from it, so documentation cannot
 * drift from the code.
 */

export type SkillCategory =
  | "Style"
  | "Animation"
  | "Asset"
  | "Layout"
  | "Shadow"
  | "WebGL"
  | "Design System"
  | "3D"
  | "Three.js"
  | "Icon";

export type SkillStatus = "implemented" | "adapted";

/** How a skill is surfaced: a reusable primitive, a theme preset, or a shader. */
export type SkillKind = "primitive" | "motion" | "surface" | "shader" | "theme" | "icon" | "asset";

export interface DesignSkill {
  id: number;
  name: string;
  slug: string;
  category: SkillCategory;
  url: string;
  kind: SkillKind;
  /** Routes where the skill is actually rendered in this app. */
  routes: string[];
  /** Component or CSS class that implements it. */
  component: string;
  purpose: string;
  mobile: string;
  rtl: string;
  performance: string;
  accessibility: string;
  sourceFiles: string[];
  status: SkillStatus;
  /** Demo key used by the gallery to render a live example. */
  demo: string;
  /** Present when the implementation deliberately differs from the source. */
  note?: string;
}

const CSS_FILE = "src/app/neuform.css";
const PRIMITIVES = "src/components/neuform/primitives.tsx";
const MOTION = "src/components/neuform/motion.tsx";
const SURFACES = "src/components/neuform/surfaces.tsx";
const SHADER_CANVAS = "src/components/neuform/webgl/ShaderCanvas.tsx";
const SHADERS = "src/components/neuform/webgl/shaders.ts";
const THEMES = "src/design/themes.ts";
const ICONS = "src/components/neuform/icons.tsx";

/** Defaults shared by every decorative WebGL surface. */
const shaderPerf =
  "Lazy-mounted via IntersectionObserver, single fullscreen quad, DPR capped at 1.5, rAF paused when offscreen or tab hidden.";
const shaderA11y =
  "Purely decorative: aria-hidden and pointer-events none. Replaced by a static gradient under prefers-reduced-motion.";
const shaderMobile = "Reduced DPR and lower step counts below 768px; static fallback on save-data.";
const shaderRtl = "Direction-agnostic field; directional shaders read --nf-dir to mirror flow.";

function shader(
  id: number,
  name: string,
  slug: string,
  category: SkillCategory,
  demo: string,
  purpose: string,
  routes: string[] = ["/design"],
  note?: string
): DesignSkill {
  return {
    id,
    name,
    slug,
    category,
    url: `https://neuform.ai/skill/${slug}`,
    kind: "shader",
    routes,
    component: `<ShaderCanvas variant="${demo}" />`,
    purpose,
    mobile: shaderMobile,
    rtl: shaderRtl,
    performance: shaderPerf,
    accessibility: shaderA11y,
    sourceFiles: [SHADER_CANVAS, SHADERS],
    status: "implemented",
    demo,
    note,
  };
}

function theme(
  id: number,
  name: string,
  slug: string,
  demo: string,
  purpose: string,
  routes: string[] = ["/design"]
): DesignSkill {
  return {
    id,
    name,
    slug,
    category: "Design System",
    url: `https://neuform.ai/skill/${slug}`,
    kind: "theme",
    routes,
    component: `<ThemeScope preset="${demo}" />`,
    purpose,
    mobile: "Tokens are unit-relative; type scale and container padding step down at 768px.",
    rtl: "Token-only — inherits document direction; all spacing uses logical properties.",
    performance: "Pure CSS custom properties, zero JS at runtime; applied via a data attribute.",
    accessibility:
      "Each preset is contrast-checked for body text (>= 4.5:1) and ships a visible focus ring token.",
    sourceFiles: [THEMES, CSS_FILE],
    status: "implemented",
    demo,
  };
}

export const DESIGN_SKILLS: DesignSkill[] = [
  {
    id: 1,
    name: "Border Gradients",
    slug: "css-border-gradient",
    category: "Style",
    url: "https://neuform.ai/skill/css-border-gradient",
    kind: "surface",
    routes: ["/", "/ask", "/design"],
    component: "<GradientBorder /> · .nf-border-gradient",
    purpose:
      "Gradient-stroked container edges that read as light catching a bevel, used on hero and answer cards.",
    mobile:
      "Border width drops to 1px and the gradient shortens so it stays visible on small cards.",
    rtl: "Gradient angle is derived from --nf-dir so the highlight always enters from the reading edge.",
    performance:
      "Single element using border-image / mask compositing — no extra DOM, no paint loop.",
    accessibility:
      "Decorative only; never the sole indicator of state, and focus rings sit above it.",
    sourceFiles: [CSS_FILE, SURFACES],
    status: "implemented",
    demo: "border-gradient",
  },
  {
    id: 2,
    name: "Masked Reveal",
    slug: "masked-reveal",
    category: "Animation",
    url: "https://neuform.ai/skill/masked-reveal",
    kind: "motion",
    routes: ["/", "/design"],
    component: "<MaskedReveal />",
    purpose: "Headlines and artwork wipe in behind a moving mask instead of a plain fade.",
    mobile:
      "Shorter travel distance and duration so the reveal completes within the first viewport.",
    rtl: "Mask travels from the inline-start edge, mirroring automatically in RTL.",
    performance: "Composited mask-position/transform only; runs once via IntersectionObserver.",
    accessibility:
      "Content is present in the DOM from the start; reduced motion renders it instantly.",
    sourceFiles: [MOTION, CSS_FILE],
    status: "implemented",
    demo: "masked-reveal",
  },
  {
    id: 3,
    name: "Aura Asset Images",
    slug: "aura-asset-images",
    category: "Asset",
    url: "https://neuform.ai/skill/aura-asset-images",
    kind: "asset",
    routes: ["/design"],
    component: "<AuraAsset seed=… />",
    purpose:
      "Atmospheric abstract imagery for empty states and covers, searchable by seed keyword.",
    mobile: "Renders at container size with a capped pixel budget; no large downloads.",
    rtl: "Non-textual imagery; layout slot uses logical margins.",
    performance:
      "Generated locally as a deterministic CSS mesh gradient — zero network requests and no layout shift.",
    accessibility: "Decorative by default (empty alt); accepts an alt prop when meaningful.",
    sourceFiles: [SURFACES],
    status: "adapted",
    demo: "aura-asset",
    note: "The hosted Aura asset search is not reachable from this app, so assets are generated deterministically from the seed with the same visual intent. The provider call is isolated behind one function for a later swap.",
  },
  {
    id: 4,
    name: "Framed Grid Layout",
    slug: "framed-grid-layout",
    category: "Layout",
    url: "https://neuform.ai/skill/framed-grid-layout",
    kind: "primitive",
    routes: ["/design"],
    component: "<FramedGrid />",
    purpose: "Content sits inside a visible hairline frame with ruled cells, like a spec sheet.",
    mobile: "Collapses from 3 columns to 1 with the frame preserved.",
    rtl: "Uses CSS logical borders so the frame reads correctly in both directions.",
    performance: "Pure grid + border rendering, no JS.",
    accessibility: "Frame is presentational; grid cells keep semantic order for screen readers.",
    sourceFiles: [PRIMITIVES, CSS_FILE],
    status: "implemented",
    demo: "framed-grid",
  },
  {
    id: 5,
    name: "Container Lines",
    slug: "container-lines",
    category: "Layout",
    url: "https://neuform.ai/skill/container-lines",
    kind: "primitive",
    routes: ["/", "/design"],
    component: "<ContainerLines />",
    purpose:
      "Vertical container-edge rules with mini corner squares that expose the layout grid as decoration.",
    mobile: "Lines hide below 640px where the container is already full-bleed.",
    rtl: "Corner markers mirror via logical inset properties.",
    performance: "Two absolutely-positioned 1px elements; no observers.",
    accessibility: "aria-hidden; contributes no reading order.",
    sourceFiles: [PRIMITIVES, CSS_FILE],
    status: "implemented",
    demo: "container-lines",
  },
  {
    id: 6,
    name: "GSAP Motion",
    slug: "gsap",
    category: "Animation",
    url: "https://neuform.ai/skill/gsap",
    kind: "motion",
    routes: ["/design"],
    component: "<Timeline /> (useTimeline hook)",
    purpose: "Sequenced, overlapping entrance choreography rather than independent CSS delays.",
    mobile: "Stagger shrinks and total duration is clamped so sequences finish quickly.",
    rtl: "Directional offsets are sign-flipped from the document direction.",
    performance:
      "Implemented on the Web Animations API instead of shipping GSAP — same timeline semantics, no extra bundle.",
    accessibility: "Timelines are skipped entirely under prefers-reduced-motion.",
    sourceFiles: [MOTION],
    status: "adapted",
    demo: "timeline",
    note: "GSAP is replaced by a small Web Animations API timeline with the same stagger/overlap model to avoid a large dependency in a client bundle.",
  },
  {
    id: 7,
    name: "Beautiful Shadows",
    slug: "beautiful-shadows",
    category: "Shadow",
    url: "https://neuform.ai/skill/beautiful-shadows",
    kind: "surface",
    routes: ["/", "/ask", "/design"],
    component: ".nf-shadow-{1..4}",
    purpose: "Layered multi-stop shadows that imply real light falloff instead of one blurry box.",
    mobile: "Lower tiers used on small screens to keep paint cost down.",
    rtl: "Light source is neutral (top-down) so shadows need no mirroring.",
    performance: "Static box-shadow tokens; no filter or blur passes.",
    accessibility: "Never used to convey state; contrast is carried by borders and text.",
    sourceFiles: [CSS_FILE],
    status: "implemented",
    demo: "shadows",
  },
  {
    id: 8,
    name: "Skeuomorphic UI",
    slug: "skeuomorphic-ui",
    category: "Style",
    url: "https://neuform.ai/skill/skeuomorphic-ui",
    kind: "surface",
    routes: ["/design"],
    component: ".nf-skeuo",
    purpose: "Physical controls with inner bevels, specular highlights and pressed states.",
    mobile: "Larger hit areas (44px) with the same bevel treatment.",
    rtl: "Bevel is vertical; unaffected by direction.",
    performance: "Inset box-shadows and gradients only.",
    accessibility: "Pressed state is mirrored with aria-pressed, not just visually.",
    sourceFiles: [CSS_FILE, SURFACES],
    status: "implemented",
    demo: "skeuomorphic",
  },
  {
    id: 9,
    name: "Dither Background",
    slug: "dither-background",
    category: "Style",
    url: "https://neuform.ai/skill/dither-background",
    kind: "surface",
    routes: ["/design"],
    component: ".nf-dither",
    purpose: "Ordered-dither texture that breaks up flat gradients with a retro print feel.",
    mobile: "Larger dither cell so the pattern stays legible at high DPR.",
    rtl: "Symmetric pattern.",
    performance: "One inline SVG/CSS pattern reused via background-image; no canvas.",
    accessibility: "Decorative; contrast of foreground text is checked against the darkest cell.",
    sourceFiles: [CSS_FILE],
    status: "implemented",
    demo: "dither",
  },
  shader(
    10,
    "WebGL Laser",
    "webgl-laser",
    "WebGL",
    "laser",
    "Thin volumetric beams sweeping through the backdrop for a charged, technical mood."
  ),
  theme(
    11,
    "Mesh Gradient Dark Blue Clean",
    "mesh-gradient-dark-blue-clean",
    "mesh-dark-blue",
    "Deep blue mesh-gradient field with clean type — a calm, product-launch aesthetic."
  ),
  theme(
    12,
    "Clean Minimal Beige Light Mode",
    "clean-minimal-beige-light-mode",
    "beige-light",
    "Warm paper-beige light mode with restrained type and generous whitespace."
  ),
  theme(
    13,
    "Glass Dark Mode Clock",
    "glass-dark-mode-clock",
    "glass-clock",
    "Dark glass design system with frosted shells and an oversized time display.",
    ["/design"]
  ),
  theme(
    14,
    "Agency Grid Layout Minimal",
    "agency-grid-layout-minimal",
    "agency-minimal",
    "Minimal agency grid: heavy negative space, small caps labels, hairline rules."
  ),
  shader(
    15,
    "WebGL 3D Object",
    "webgl-3d-object",
    "3D",
    "object3d",
    "A lit 3D object with real depth, shading and soft shadow occlusion.",
    ["/design"],
    "Raymarched signed-distance geometry in a fragment shader instead of a Three.js scene graph — real lighting and depth with no 3D-engine dependency."
  ),
  theme(
    16,
    "High Contrast Skeuomorphic Clean",
    "high-contrast-skeuomorphic-clean",
    "skeuo-contrast",
    "Skeuomorphic controls pushed to high contrast for accessibility-first surfaces."
  ),
  shader(
    17,
    "Background Grid WebGL",
    "background-grid-webgl",
    "Layout",
    "grid-perspective",
    "Perspective grid receding to the horizon with lines fading into fog.",
    ["/design"]
  ),
  theme(
    18,
    "Editorial Tech",
    "editorial-tech",
    "editorial-tech",
    "Editorial typography with technical furniture: rules, captions and figure numbers."
  ),
  theme(
    19,
    "Orange Clean Paper SaaS",
    "orange-clean-paper-saas",
    "orange-paper",
    "Paper-white SaaS surface with a single warm orange accent."
  ),
  theme(
    20,
    "Light Mode Paper Technical",
    "light-mode-paper-technical",
    "paper-technical",
    "Light technical documentation look: graph paper, mono labels, thin rules."
  ),
  {
    id: 21,
    name: "Company Logos",
    slug: "company-logos",
    category: "Icon",
    url: "https://neuform.ai/skill/company-logos",
    kind: "icon",
    routes: ["/design"],
    component: "<BrandLogo name=… size={64} />",
    purpose: "Real brand marks (Iconify Simple Icons, 64px) instead of text placeholders.",
    mobile: "Scales to 40px with the same optical weight.",
    rtl: "Logo rows use logical gap and reverse order in RTL.",
    performance:
      "Fetched as a single SVG per mark from the Iconify CDN with lazy loading, and falls back to an inline monogram offline.",
    accessibility: "Each mark carries an accessible name; decorative rows are aria-hidden.",
    sourceFiles: [ICONS],
    status: "implemented",
    demo: "brand-logos",
  },
  theme(
    22,
    "Image First Grid Layout",
    "image-first-grid-layout",
    "image-first",
    "Grid where imagery leads and copy is secondary — built for artwork-driven catalogues.",
    ["/design"]
  ),
  theme(
    23,
    "Technical Framed Grid Design System",
    "technical-framed-grid-design-system-tzckhr",
    "technical-framed",
    "Framed technical grid with coordinate labels and measured gutters."
  ),
  {
    id: 24,
    name: "Fade in, slide in, blur in animation",
    slug: "atmospheric-blur-slide-entrance-system-cblgqz",
    category: "Design System",
    url: "https://neuform.ai/skill/atmospheric-blur-slide-entrance-system-cblgqz",
    kind: "motion",
    routes: ["/", "/ask", "/design"],
    component: "<Reveal variant='blur' | 'slide' | 'fade' />",
    purpose: "Atmospheric entrance: content fades, slides and defocuses into place together.",
    mobile: "Travel reduced to 12px and blur to 6px so it never feels sluggish on scroll.",
    rtl: "Slide axis flips to the inline-start direction.",
    performance:
      "Transform/opacity/filter on the compositor, fired once by IntersectionObserver then unobserved.",
    accessibility: "No-ops under prefers-reduced-motion; content renders in final state.",
    sourceFiles: [MOTION],
    status: "implemented",
    demo: "reveal",
  },
  {
    id: 25,
    name: "Corner Diagonals",
    slug: "corner-diagonals",
    category: "Layout",
    url: "https://neuform.ai/skill/corner-diagonals",
    kind: "primitive",
    routes: ["/ask", "/design"],
    component: "<CornerDiagonals />",
    purpose: "Diagonal notches at container corners that signal a technical, engineered frame.",
    mobile: "Notch length halves below 640px.",
    rtl: "Corner set mirrors so the emphasised corner stays on the reading edge.",
    performance: "Four 1px pseudo-elements; no JS.",
    accessibility: "aria-hidden decoration.",
    sourceFiles: [PRIMITIVES, CSS_FILE],
    status: "implemented",
    demo: "corner-diagonals",
  },
  theme(
    26,
    "Nested Container Clean Agency",
    "nested-container-clean-agency",
    "nested-agency",
    "Clean agency layout built from concentric containers with consistent inset rhythm."
  ),
  theme(
    27,
    "Technical Terminal & WebGL Grid System",
    "technical-terminal-and-webgl-grid-system-v9lmbm",
    "terminal-grid",
    "Terminal panels over a WebGL grid — logs, monospace labels and a live field.",
    ["/ask", "/design"]
  ),
  shader(
    28,
    "Globe Particles",
    "globe-particles",
    "3D",
    "globe-particles",
    "A rotating globe built from luminous points with depth-faded back hemisphere.",
    ["/design"],
    "Points are generated and projected in a shader pass rather than a Three.js Points object, keeping the bundle free of a 3D engine."
  ),
  theme(
    29,
    "Split Layout Technical",
    "split-layout-technical",
    "split-technical",
    "Two-column split with a fixed technical rail and a scrolling content side."
  ),
  {
    id: 30,
    name: "Nested Container Frames",
    slug: "nested-container-frames",
    category: "Layout",
    url: "https://neuform.ai/skill/nested-container-frames",
    kind: "primitive",
    routes: ["/design"],
    component: "<NestedFrames depth={3} />",
    purpose: "Concentric hairline frames that build hierarchy without heavy dividers.",
    mobile: "Depth clamps to 2 to preserve inner content width.",
    rtl: "Symmetric insets; direction-neutral.",
    performance: "Nested divs with border and padding only.",
    accessibility: "Frames are presentational; inner content keeps its own landmarks.",
    sourceFiles: [PRIMITIVES, CSS_FILE],
    status: "implemented",
    demo: "nested-frames",
  },
  {
    id: 31,
    name: "Solar Duotone Bold",
    slug: "solar-duotone-bold",
    category: "Icon",
    url: "https://neuform.ai/skill/solar-duotone-bold",
    kind: "icon",
    routes: ["/design"],
    component: "<DuotoneIcon name=… />",
    purpose:
      "Consistent duotone icon language where a bold fill pairs with a lighter accent shape.",
    mobile: "24px baseline with a 44px touch target.",
    rtl: "Directional glyphs (arrows, chevrons) flip with the document direction.",
    performance: "Inline SVG paths — no icon font, no runtime fetch for the built-in set.",
    accessibility: "role=img with a label, or aria-hidden when paired with visible text.",
    sourceFiles: [ICONS],
    status: "implemented",
    demo: "duotone-icons",
  },
  theme(
    32,
    "Stepped Neon V-Curve Glass System",
    "stepped-neon-v-curve-glass-system-xy0g97",
    "neon-v-curve",
    "Glass panels stepped along a neon V-curve, with light pooling at the vertex.",
    ["/design"]
  ),
  {
    id: 33,
    name: "Progressive Blur",
    slug: "progressive-blur",
    category: "Style",
    url: "https://neuform.ai/skill/progressive-blur",
    kind: "surface",
    routes: ["/", "/ask", "/design"],
    component: "<ProgressiveBlur edge=… />",
    purpose: "Layered edge blur that fades content into the chrome instead of cutting it off.",
    mobile: "Three blur layers instead of five to limit backdrop-filter cost.",
    rtl: "Edge prop accepts logical values (start/end) and resolves per direction.",
    performance:
      "Stacked backdrop-filter layers with masked opacity; disabled automatically when backdrop-filter is unsupported.",
    accessibility: "Text never sits inside the blurred band, so contrast is unaffected.",
    sourceFiles: [SURFACES, CSS_FILE],
    status: "implemented",
    demo: "progressive-blur",
  },
  {
    id: 34,
    name: "Marquee",
    slug: "marquee-loop",
    category: "Animation",
    url: "https://neuform.ai/skill/marquee-loop",
    kind: "motion",
    routes: ["/", "/design"],
    component: "<Marquee speed=… />",
    purpose: "Seamless infinite ticker built from duplicated content for continuous motion.",
    mobile: "Speed reduced and content duplicated twice instead of three times.",
    rtl: "Scroll direction flips with document direction.",
    performance: "Single transform animation on a duplicated track; paused when offscreen.",
    accessibility:
      "Duplicated copy is aria-hidden, the track pauses on hover/focus, and motion is disabled under reduced-motion.",
    sourceFiles: [MOTION, CSS_FILE],
    status: "implemented",
    demo: "marquee",
  },
  theme(
    35,
    "Blue Cloudy Clean Modern",
    "blue-cloudy-clean-modern",
    "blue-cloudy",
    "Soft clouded blue gradients with clean modern type — light, airy product surface."
  ),
  {
    id: 36,
    name: "Premium Gradient Border System",
    slug: "premium-gradient-border-system-6skdcm",
    category: "Style",
    url: "https://neuform.ai/skill/premium-gradient-border-system-6skdcm",
    kind: "surface",
    routes: ["/ask", "/design"],
    component: "<GradientBorder tone='premium' animated />",
    purpose: "A full border system: idle, hover and active gradient strokes with a conic sweep.",
    mobile: "Animation disabled; static premium stroke retained.",
    rtl: "Conic sweep start angle derives from --nf-dir.",
    performance: "Animates one CSS custom property via @property, compositor-friendly.",
    accessibility: "Border state always pairs with a non-colour cue (label or icon).",
    sourceFiles: [SURFACES, CSS_FILE],
    status: "implemented",
    demo: "gradient-border-system",
  },
  theme(
    37,
    "Technical Wireframe Info Layout",
    "technical-wireframe-info-layout",
    "wireframe-info",
    "Wireframe-styled information layout: labelled boxes, leader lines and measurements.",
    ["/design"]
  ),
  shader(
    38,
    "Magic Rings Telemetry Aesthetic",
    "magic-rings-telemetry-aesthetic-1nwy1l",
    "WebGL",
    "magic-rings",
    "Concentric telemetry rings that pulse and scan like an instrument readout."
  ),
  shader(
    39,
    "Corner Lasers",
    "corner-lasers",
    "WebGL",
    "corner-lasers",
    "Thin beams anchored to the corners, converging as a framing device."
  ),
  shader(
    40,
    "Aura 3D Network System",
    "aura-3d-network-system-i4oa3n",
    "Style",
    "aura-network",
    "A luminous node-and-edge network drifting in depth, used as an intelligence motif."
  ),
  shader(
    41,
    "Technical WebGL Fluid Nebula Background",
    "technical-webgl-fluid-nebula-background-2zdue1",
    "WebGL",
    "nebula",
    "Slow fluid nebula with curl-noise advection for an atmospheric technical backdrop.",
    ["/", "/design"],
    "Implemented as a curl-noise fragment shader rather than a Three.js post-processing chain."
  ),
  {
    id: 42,
    name: "Cursor-Reactive Flashlight Glow Border",
    slug: "cursor-reactive-flashlight-glow-border-xa9a9z",
    category: "Design System",
    url: "https://neuform.ai/skill/cursor-reactive-flashlight-glow-border-xa9a9z",
    kind: "surface",
    routes: ["/ask", "/design"],
    component: "<FlashlightBorder />",
    purpose:
      "A pointer-tracked light that grazes the container edge, revealing the border locally.",
    mobile: "Pointer tracking disabled on coarse pointers; a gentle static glow is used instead.",
    rtl: "Position is computed from the element box, so it is direction-independent.",
    performance:
      "Pointer coordinates written to CSS variables inside rAF, one listener per card, removed on unmount.",
    accessibility: "Hover-only affordance; keyboard focus shows the same glow via :focus-within.",
    sourceFiles: [SURFACES, CSS_FILE],
    status: "implemented",
    demo: "flashlight-border",
  },
  {
    id: 43,
    name: "Interactive Border Gradient Glow",
    slug: "interactive-border-gradient-glow-wnu6m4",
    category: "Design System",
    url: "https://neuform.ai/skill/interactive-border-gradient-glow-wnu6m4",
    kind: "surface",
    routes: ["/ask", "/design"],
    component: "<GradientBorder interactive />",
    purpose: "Border gradient that intensifies and rotates on interaction to signal affordance.",
    mobile: "Falls back to the active/pressed state only.",
    rtl: "Rotation direction follows --nf-dir.",
    performance: "Animated @property angle; no layout or paint thrash.",
    accessibility: "Paired with a focus-visible ring so keyboard users get the same signal.",
    sourceFiles: [SURFACES, CSS_FILE],
    status: "implemented",
    demo: "interactive-glow",
  },
  {
    id: 44,
    name: "Atmospheric Ambient Ray & Particle System",
    slug: "atmospheric-ambient-ray-and-particle-system-3yx90f",
    category: "Animation",
    url: "https://neuform.ai/skill/atmospheric-ambient-ray-and-particle-system-3yx90f",
    kind: "motion",
    routes: ["/", "/design"],
    component: "<AmbientRays density=… />",
    purpose: "Drifting light rays and dust that give a static page a sense of air.",
    mobile: "Particle count scales with viewport area and caps at 24.",
    rtl: "Drift direction follows --nf-dir.",
    performance:
      "CSS-animated DOM particles (no canvas), count derived from viewport, paused when offscreen.",
    accessibility: "aria-hidden; fully removed under prefers-reduced-motion.",
    sourceFiles: [MOTION, CSS_FILE],
    status: "implemented",
    demo: "ambient-rays",
  },
  theme(
    45,
    "Industrial WebGL Minimalist System",
    "industrial-webgl-minimalist-system-v9b1kp",
    "industrial-minimal",
    "Industrial minimalism: concrete greys, hard rules and a single mechanical accent."
  ),
  {
    id: 46,
    name: "3D Perspective Scroll Dashboard",
    slug: "3d-perspective-scroll-dashboard-0hq031",
    category: "Design System",
    url: "https://neuform.ai/skill/3d-perspective-scroll-dashboard-0hq031",
    kind: "motion",
    routes: ["/design"],
    component: "<PerspectiveDeck />",
    purpose: "Dashboard panels tilted in perspective that straighten as they scroll into view.",
    mobile: "Tilt angle reduced to 6deg to avoid text distortion on small screens.",
    rtl: "rotateY sign flips with direction so panels open toward the reader.",
    performance: "CSS 3D transforms driven by one IntersectionObserver; no scroll listener.",
    accessibility: "Transform is visual only; reduced motion renders panels flat.",
    sourceFiles: [MOTION, CSS_FILE],
    status: "implemented",
    demo: "perspective-deck",
  },
  shader(
    47,
    "Procedural Mesh Network Background",
    "procedural-mesh-network-background-txudfu",
    "WebGL",
    "mesh-network",
    "A meditative procedural mesh that breathes, connecting nodes with fading filaments."
  ),
  shader(
    48,
    "Aura Isometric 3D Visualization System",
    "aura-isometric-3d-visualization-system-i4nez9",
    "Three.js",
    "isometric-aura",
    "Isometric volumetric blocks with an aura glow, used for spatial data motifs.",
    ["/design"],
    "Rendered as an isometric raymarch in a fragment shader instead of a Three.js scene."
  ),
  theme(
    49,
    "Dither Laser Dark Mode",
    "dither-laser-dark-mode",
    "dither-laser",
    "Dark mode where dithered texture meets laser accents — grainy and charged.",
    ["/design"]
  ),
  shader(
    50,
    "Atmospheric Grain WebGL Background",
    "atmospheric-grain-webgl-background-y6jnkl",
    "WebGL",
    "grain",
    "Animated film grain over a soft vignette for a technical, photographic base.",
    ["/", "/design"]
  ),
  shader(
    51,
    "Atmospheric Procedural WebGL Background",
    "atmospheric-procedural-webgl-background-2zumzs",
    "WebGL",
    "procedural",
    "Layered value-noise clouds that evolve slowly behind content."
  ),
  {
    id: 52,
    name: "GSAP ScrollTrigger Storytelling",
    slug: "gsap-scrolltrigger-storytelling",
    category: "Animation",
    url: "https://neuform.ai/skill/gsap-scrolltrigger-storytelling",
    kind: "motion",
    routes: ["/design"],
    component: "<ScrollStory steps=… />",
    purpose: "Scroll-linked narrative where each step pins, plays and hands off to the next.",
    mobile: "Pinning disabled; steps become a simple stacked sequence.",
    rtl: "Horizontal step motion mirrors with direction.",
    performance:
      "Driven by IntersectionObserver thresholds rather than a scroll handler, so it never blocks the main thread.",
    accessibility:
      "All steps remain in the DOM and reachable; reduced motion turns it into a plain list.",
    sourceFiles: [MOTION],
    status: "adapted",
    demo: "scroll-story",
    note: "ScrollTrigger behaviour reproduced with IntersectionObserver to avoid bundling GSAP.",
  },
  {
    id: 53,
    name: "Number Details",
    slug: "number-details",
    category: "Style",
    url: "https://neuform.ai/skill/number-details",
    kind: "primitive",
    routes: ["/", "/design"],
    component: "<NumberDetail value='01' />",
    purpose: "Decorative zero-padded index numerals (01, 02…) that give sections technical rhythm.",
    mobile: "Numerals shrink but keep tabular alignment.",
    rtl: "Rendered with an isolation wrapper so Latin numerals stay LTR inside RTL text.",
    performance: "Text node with a tabular-nums font feature; nothing else.",
    accessibility: "aria-hidden when purely decorative so counts are not announced twice.",
    sourceFiles: [PRIMITIVES, CSS_FILE],
    status: "implemented",
    demo: "number-details",
  },
  shader(
    54,
    "D3 Interactive Point-Cloud Globe",
    "d3-interactive-point-cloud-globe-3zkwpn",
    "Animation",
    "globe-pointcloud",
    "Interactive point-cloud globe that responds to pointer drag with inertial spin.",
    ["/design"],
    "Projection and point cloud are computed in a shader with pointer-driven uniforms instead of D3 + SVG, which keeps 60fps with thousands of points."
  ),
  shader(
    55,
    "Technical ASCII Particle Field",
    "technical-ascii-particle-field-2zi2vw",
    "WebGL",
    "ascii-field",
    "Particle field quantised into ASCII glyph cells for a terminal-flavoured texture."
  ),
  shader(
    56,
    "Cyber-Trail WebGL Background System",
    "cyber-trail-webgl-background-system-vdwsx2",
    "WebGL",
    "cyber-trail",
    "Cinematic light trails streaking through depth with motion-blurred tails."
  ),
  theme(
    57,
    "Atmospheric Meditative Dark System",
    "atmospheric-meditative-dark-system-wr0bj8",
    "meditative-dark",
    "Slow, low-contrast dark system built for long sessions and calm reading.",
    ["/", "/design"]
  ),
  theme(
    58,
    "Atmospheric Laser & WebGL Design System",
    "atmospheric-laser-and-webgl-design-system-8ljti2",
    "laser-atmosphere",
    "Atmospheric dark system where laser accents and a live field carry the brand."
  ),
  shader(
    59,
    "Technical Shader Surface (WebGL)",
    "technical-shader-surface-webgl-2zrur1",
    "WebGL",
    "shader-surface",
    "A shaded technical surface with contour banding that reacts to light direction."
  ),
  shader(
    60,
    "Atmospheric Topographic WebGL",
    "atmospheric-topographic-webgl-u55nmy",
    "WebGL",
    "topographic",
    "Topographic contour lines drifting like a living elevation map."
  ),
  shader(
    61,
    "Isometric Spatial 3D System",
    "isometric-spatial-3d-system-i58999",
    "3D",
    "isometric-spatial",
    "A technical isometric lattice of extruded cells with spatial depth cues.",
    ["/design"],
    "Isometric volume raymarched in a fragment shader rather than a Three.js scene graph."
  ),
  theme(
    62,
    "Atmospheric Technical Design System",
    "atmospheric-technical-design-system-u1ciwi",
    "atmospheric-technical",
    "Technical system with atmospheric depth: mono labels, hairlines and a soft field."
  ),
  theme(
    63,
    "Cyber Kinetic Background Field",
    "cyber-kinetic-background-field-3yguj9",
    "cyber-kinetic",
    "High-energy kinetic field with cyan/magenta separation behind restrained UI.",
    ["/design"]
  ),
  {
    id: 64,
    name: "Gooey Blob System",
    slug: "gooey-blob-system",
    category: "Style",
    url: "https://neuform.ai/skill/gooey-blob-system",
    kind: "surface",
    routes: ["/design"],
    component: "<GooeyBlobs />",
    purpose: "Metaball blobs that merge and separate for an organic, liquid background.",
    mobile: "Blob count drops to three and the filter radius shrinks.",
    rtl: "Organic and symmetric; no mirroring required.",
    performance:
      "SVG goo filter over CSS-animated circles, isolated in its own stacking context to limit repaint area.",
    accessibility: "aria-hidden; removed entirely under reduced motion.",
    sourceFiles: [SURFACES, CSS_FILE],
    status: "implemented",
    demo: "gooey-blobs",
  },
  shader(
    65,
    "Technical Tactical Globe UI",
    "technical-tactical-globe-ui-3zjv9a",
    "Style",
    "tactical-globe",
    "Wireframe tactical globe with graticule, scan sweep and target reticles."
  ),
  shader(
    66,
    "Atmospheric WebGL Field System",
    "atmospheric-webgl-field-system-8lvtag",
    "Style",
    "field-system",
    "A slow vector field of drifting filaments that gives depth without distraction.",
    ["/", "/design"]
  ),
  shader(
    67,
    "Organic Aetherial WebGL Background",
    "organic-aetherial-webgl-background-316jwq",
    "WebGL",
    "aetherial",
    "Retro-futurist aetherial wash: organic folds of light with chromatic edges."
  ),
  theme(
    68,
    "Book Serif Index",
    "book-serif-index",
    "book-serif",
    "Archival book-reader system: serif-led pages, index rails and running heads."
  ),
  theme(
    69,
    "Kinetic Radial Sculpture System",
    "kinetic-radial-sculpture-system-0gv4e7",
    "kinetic-radial",
    "Radial sculptural forms rotating as a hero motif with type wrapped around them.",
    ["/design"]
  ),
  shader(
    70,
    "Chromatic Dispersion WebGL System",
    "chromatic-dispersion-webgl-system-40mkq2",
    "WebGL",
    "chromatic-dispersion",
    "Prismatic dispersion splitting light into RGB fringes across a refracting surface."
  ),
  shader(
    71,
    "Grainy Stepped Gradient Noise",
    "grainy-stepped-gradient-noise-trdra9",
    "WebGL",
    "stepped-noise",
    "Posterised gradient steps dissolved by grain — a printed-poster gradient."
  ),
];

export const SKILL_COUNT = DESIGN_SKILLS.length;

export const SKILL_CATEGORIES = Array.from(
  new Set(DESIGN_SKILLS.map((s) => s.category))
).sort() as SkillCategory[];

export function skillsByCategory(category: SkillCategory): DesignSkill[] {
  return DESIGN_SKILLS.filter((s) => s.category === category);
}

export function skillsForRoute(route: string): DesignSkill[] {
  return DESIGN_SKILLS.filter((s) => s.routes.includes(route));
}

export function getSkill(slug: string): DesignSkill | undefined {
  return DESIGN_SKILLS.find((s) => s.slug === slug);
}
