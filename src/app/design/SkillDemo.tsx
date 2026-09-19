"use client";

/**
 * Live demo renderer for every skill in the registry.
 *
 * Heavy WebGL surfaces are code-split and only mounted once their card scrolls
 * into view, so opening the gallery never spins up 24 GL contexts at once.
 */

import dynamic from "next/dynamic";
import type { DesignSkill } from "@/design/skills";
import { useInView } from "@/components/neuform/hooks";
import {
  AmbientRays,
  AuraAsset,
  BrandLogoRow,
  ContainerLines,
  CornerDiagonals,
  DuotoneIcon,
  FlashlightBorder,
  FramedGrid,
  GooeyBlobs,
  GradientBorder,
  KineticRadial,
  Marquee,
  MaskedReveal,
  NestedFrames,
  NumberDetail,
  PerspectiveDeck,
  ProgressiveBlur,
  Reveal,
  ScrollStory,
  Skeuo,
  SplitTechnical,
  TerminalPanel,
  ThemeScope,
  Timeline,
  WireframeBox,
} from "@/components/neuform";

const ShaderCanvas = dynamic(
  () => import("@/components/neuform/webgl/ShaderCanvas").then((m) => m.ShaderCanvas),
  {
    ssr: false,
    loading: () => <div className="h-full w-full" style={{ background: "#0b0806" }} />,
  }
);

const STAGE = "relative h-44 w-full overflow-hidden rounded-xl";

function Stage({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <div className={`${STAGE} ${className}`}>{children}</div>;
}

/**
 * Shader cards mount their GL context only while visible and release it once
 * scrolled away — a gallery of 24 shaders would otherwise blow past the
 * browser's simultaneous-WebGL-context limit and break every canvas.
 */
function ShaderStage({ variant, interactive }: { variant: string; interactive?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>({
    once: false,
    threshold: 0,
    rootMargin: "150px 0px",
  });
  return (
    <div ref={ref} className={STAGE} style={{ background: "#0b0806" }}>
      {inView ? <ShaderCanvas variant={variant} interactive={interactive} /> : null}
    </div>
  );
}

function ThemeStage({ preset }: { preset: string }) {
  return (
    <ThemeScope
      preset={preset}
      className={`${STAGE} p-4`}
      style={{ display: "grid", alignContent: "space-between" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--nf-theme-muted)",
            fontFamily: "var(--nf-theme-mono)",
          }}
        >
          Preset
        </span>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "var(--nf-theme-accent)",
          }}
          aria-hidden
        />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Listen by feeling</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--nf-theme-muted)" }}>
          Artwork, atmosphere, rejection memory.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <span
          style={{
            padding: "5px 12px",
            borderRadius: "var(--nf-theme-radius)",
            background: "var(--nf-theme-accent)",
            color: "var(--nf-theme-bg)",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Play
        </span>
        <span
          style={{
            padding: "5px 12px",
            borderRadius: "var(--nf-theme-radius)",
            border: "1px solid var(--nf-theme-line)",
            background: "var(--nf-theme-surface)",
            fontSize: 11,
          }}
        >
          Queue
        </span>
      </div>
    </ThemeScope>
  );
}

const TRACKS = ["Doomjazz", "Rhubarb", "Archangel", "Olson", "Nannou", "On Land"];

export function SkillDemo({ skill }: { skill: DesignSkill }) {
  if (skill.kind === "shader") {
    return (
      <ShaderStage
        variant={skill.demo}
        interactive={["globe-pointcloud", "chromatic-dispersion", "globe-particles"].includes(
          skill.demo
        )}
      />
    );
  }

  if (skill.kind === "theme") return <ThemeStage preset={skill.demo} />;

  switch (skill.demo) {
    case "border-gradient":
      return (
        <Stage>
          <GradientBorder className="grid h-full place-items-center bg-[#0b0806] text-sm text-white/70">
            <span>Gradient-stroked edge</span>
          </GradientBorder>
        </Stage>
      );

    case "gradient-border-system":
      return (
        <Stage>
          <GradientBorder
            tone="premium"
            animated
            className="grid h-full place-items-center bg-[#0b0806] text-sm text-white/75"
          >
            <span>Premium conic stroke</span>
          </GradientBorder>
        </Stage>
      );

    case "interactive-glow":
      return (
        <Stage>
          <GradientBorder
            tone="premium"
            interactive
            animated
            className="grid h-full place-items-center bg-[#0b0806] text-sm text-white/75"
          >
            <button type="button" className="rounded-full px-4 py-2 text-xs text-white/80">
              Hover or focus me
            </button>
          </GradientBorder>
        </Stage>
      );

    case "flashlight-border":
      return (
        <Stage>
          <FlashlightBorder className="grid h-full place-items-center rounded-xl border border-white/10 bg-[#0b0806] text-sm text-white/70">
            <button type="button" className="rounded-full px-4 py-2 text-xs">
              Move the pointer across
            </button>
          </FlashlightBorder>
        </Stage>
      );

    case "shadows":
      return (
        <Stage className="grid grid-cols-4 place-items-center gap-2 bg-[#0e0b09] p-4">
          {[1, 2, 3, 4].map((tier) => (
            <div
              key={tier}
              className={`nf-shadow-${tier} grid h-14 w-full place-items-center rounded-lg bg-[#1a1512] text-[11px] text-white/60`}
            >
              {tier}
            </div>
          ))}
        </Stage>
      );

    case "skeuomorphic":
      return (
        <Stage className="flex items-center justify-center gap-3 bg-[#0e0b09]">
          <Skeuo>Default</Skeuo>
          <Skeuo pressed>Pressed</Skeuo>
          <Skeuo contrast="high">High contrast</Skeuo>
        </Stage>
      );

    case "dither":
      return <Stage className="nf-dither" />;

    case "progressive-blur":
      return (
        <Stage className="bg-[#0b0806]">
          <div className="p-4 text-xs leading-relaxed text-white/45">
            {Array.from({ length: 8 }, (_, i) => (
              <p key={i}>
                Layered edge blur fades this text into the chrome instead of clipping it.
              </p>
            ))}
          </div>
          <ProgressiveBlur edge="bottom" height={88} />
        </Stage>
      );

    case "container-lines":
      return (
        <Stage className="bg-[#0b0806] p-6">
          <ContainerLines className="grid h-full place-items-center text-xs text-white/55">
            Container edges exposed
          </ContainerLines>
        </Stage>
      );

    case "corner-diagonals":
      return (
        <Stage className="grid place-items-center bg-[#0b0806] p-6">
          <CornerDiagonals className="grid h-24 w-3/4 place-items-center rounded-lg border border-white/10 text-xs text-white/55">
            Notched frame
          </CornerDiagonals>
        </Stage>
      );

    case "nested-frames":
      return (
        <Stage className="grid place-items-center bg-[#0b0806] p-4">
          <NestedFrames depth={3} className="w-full">
            <div className="grid h-16 place-items-center text-xs text-white/55">Depth 3</div>
          </NestedFrames>
        </Stage>
      );

    case "framed-grid":
      return (
        <Stage className="bg-[#0b0806]">
          <FramedGrid columns={3} className="h-full">
            {["01", "02", "03", "04", "05", "06"].map((n) => (
              <div key={n} className="grid place-items-center text-[11px] text-white/45">
                <NumberDetail value={n} />
              </div>
            ))}
          </FramedGrid>
        </Stage>
      );

    case "number-details":
      return (
        <Stage className="flex items-center justify-center gap-5 bg-[#0b0806]">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="text-center">
              <NumberDetail value={n} className="text-2xl" />
              <p className="mt-1 text-[10px] uppercase tracking-widest text-white/35">Section</p>
            </div>
          ))}
        </Stage>
      );

    case "marquee":
      return (
        <Stage className="grid place-items-center bg-[#0b0806]">
          <Marquee durationSeconds={18} className="w-full">
            {TRACKS.map((t) => (
              <span key={t} className="text-sm whitespace-nowrap text-white/55">
                {t} <span className="text-white/20">·</span>
              </span>
            ))}
          </Marquee>
        </Stage>
      );

    case "masked-reveal":
      return (
        <Stage className="grid place-items-center bg-[#0b0806] px-6">
          <MaskedReveal>
            <p className="text-xl font-semibold text-white/85">Listen by feeling, not by genre.</p>
          </MaskedReveal>
        </Stage>
      );

    case "reveal":
      return (
        <Stage className="grid grid-cols-3 items-center gap-3 bg-[#0b0806] p-4">
          {(["fade", "slide", "blur"] as const).map((variant, i) => (
            <Reveal key={variant} variant={variant} delay={i * 140}>
              <div className="grid h-20 place-items-center rounded-lg border border-white/10 text-[11px] text-white/55">
                {variant}
              </div>
            </Reveal>
          ))}
        </Stage>
      );

    case "timeline":
      return (
        <Stage className="bg-[#0b0806] p-4">
          <Timeline className="grid h-full grid-cols-4 items-center gap-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="grid h-16 place-items-center rounded-lg border border-white/10 text-[11px] text-white/55"
              >
                <NumberDetail value={n} />
              </div>
            ))}
          </Timeline>
        </Stage>
      );

    case "ambient-rays":
      return (
        <Stage className="bg-[#0b0806]">
          <AmbientRays rays={5} dust={14} />
          <div className="grid h-full place-items-center text-xs text-white/45">
            Rays &amp; dust
          </div>
        </Stage>
      );

    case "perspective-deck":
      return (
        <Stage className="bg-[#0b0806] p-4">
          <PerspectiveDeck
            className="grid h-full gap-2"
            panels={["Signals", "Retrieval", "Safety"].map((label) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/55"
              >
                {label}
              </div>
            ))}
          />
        </Stage>
      );

    case "scroll-story":
      return (
        <Stage className="overflow-y-auto bg-[#0b0806] p-4">
          <ScrollStory
            steps={[
              { title: "Compass", body: "The listener sets an emotional target." },
              { title: "Ranker", body: "Catalog is scored by emotional distance." },
              { title: "Memory", body: "Rejections reshape the next room." },
            ]}
          />
        </Stage>
      );

    case "kinetic-radial":
      return (
        <Stage className="grid place-items-center bg-[#0b0806]">
          <KineticRadial rings={4} size={140} />
        </Stage>
      );

    case "gooey-blobs":
      return (
        <Stage className="bg-[#0b0806]">
          <GooeyBlobs count={4} />
        </Stage>
      );

    case "aura-asset":
      return (
        <Stage className="grid grid-cols-3 gap-2 bg-[#0b0806] p-3">
          {["nocturne", "velvet room", "arctic"].map((seed) => (
            <div key={seed} className="overflow-hidden rounded-lg">
              <AuraAsset seed={seed} className="h-full w-full" style={{ minHeight: 100 }} />
            </div>
          ))}
        </Stage>
      );

    case "brand-logos":
      return (
        <Stage className="grid place-items-center bg-[#0b0806] p-4">
          <BrandLogoRow
            size={40}
            names={[
              { name: "spotify" },
              { name: "apple", label: "Apple Music" },
              { name: "bandcamp" },
              { name: "soundcloud" },
              { name: "discogs" },
            ]}
          />
        </Stage>
      );

    case "duotone-icons":
      return (
        <Stage className="flex items-center justify-center gap-5 bg-[#0b0806]">
          {(["play", "waveform", "spark", "layers", "shield", "arrow"] as const).map((n) => (
            <DuotoneIcon key={n} name={n} size={30} label={n} />
          ))}
        </Stage>
      );

    default:
      return (
        <Stage className="grid place-items-center bg-[#0b0806] text-xs text-white/35">
          <SplitTechnical rail={<TerminalPanel lines={["ready"]} />}>
            <WireframeBox label={skill.demo}>
              <div className="h-16" />
            </WireframeBox>
          </SplitTechnical>
        </Stage>
      );
  }
}
