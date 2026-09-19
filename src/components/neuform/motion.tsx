"use client";

/**
 * Motion skills: entrance choreography, masked reveal, marquee, ambient rays,
 * scroll storytelling, perspective deck and kinetic radial sculpture.
 *
 * Every component is a no-op under prefers-reduced-motion and only animates
 * while it is on screen.
 */

import { Children, useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { useInView, useReducedMotion } from "./hooks";

type RevealVariant = "fade" | "slide" | "blur" | "inline";

/** Skill 24 — atmospheric fade + slide + blur entrance. */
export function Reveal({
  children,
  variant = "blur",
  delay = 0,
  className = "",
  style,
  as: Tag = "div",
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "li" | "article" | "span";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      className={`nf-reveal ${className}`}
      data-variant={variant}
      data-shown={inView || undefined}
      style={{ ["--nf-delay" as string]: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}

/** Skill 2 — content wipes in behind a travelling mask. */
export function MaskedReveal({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`nf-masked-reveal ${className}`}
      data-revealed={inView || undefined}
      style={style}
    >
      {children}
    </div>
  );
}

/** Skill 34 — seamless infinite marquee built from duplicated content. */
export function Marquee({
  children,
  durationSeconds = 24,
  gap = "2.5rem",
  className = "",
}: {
  children: ReactNode;
  durationSeconds?: number;
  gap?: string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ once: false, threshold: 0 });
  const items = Children.toArray(children);

  return (
    <div ref={ref} className={`nf-marquee ${className}`}>
      <div
        className="nf-marquee-track"
        style={{
          ["--nf-marquee-duration" as string]: `${durationSeconds}s`,
          ["--nf-gap" as string]: gap,
          animationPlayState: inView ? "running" : "paused",
        }}
      >
        {items.map((item, i) => (
          <span key={`a-${i}`}>{item}</span>
        ))}
        {/* Duplicate makes the loop seamless; hidden from assistive tech. */}
        {items.map((item, i) => (
          <span key={`b-${i}`} aria-hidden>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Skill 44 — drifting light rays and dust motes. */
export function AmbientRays({
  rays = 5,
  dust = 16,
  className = "",
}: {
  rays?: number;
  dust?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({ once: false, threshold: 0 });

  // Deterministic placement keeps SSR and hydration identical.
  const rayNodes = useMemo(
    () =>
      Array.from({ length: rays }, (_, i) => ({
        left: `${(i + 1) * (100 / (rays + 1))}%`,
        delay: i * 900,
        duration: 12 + (i % 4) * 2,
      })),
    [rays]
  );
  const dustNodes = useMemo(
    () =>
      Array.from({ length: dust }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        delay: i * 520,
        duration: 14 + (i % 6) * 3,
      })),
    [dust]
  );

  if (reduced) return null;

  return (
    <div ref={ref} className={`nf-rays ${className}`} aria-hidden>
      {rayNodes.map((r, i) => (
        <span
          key={`r-${i}`}
          className="nf-ray"
          style={{
            left: r.left,
            ["--nf-delay" as string]: `${r.delay}ms`,
            ["--nf-ray-duration" as string]: `${r.duration}s`,
            animationPlayState: inView ? "running" : "paused",
          }}
        />
      ))}
      {dustNodes.map((d, i) => (
        <span
          key={`d-${i}`}
          className="nf-dust"
          style={{
            left: d.left,
            top: d.top,
            ["--nf-delay" as string]: `${d.delay}ms`,
            ["--nf-dust-duration" as string]: `${d.duration}s`,
            animationPlayState: inView ? "running" : "paused",
          }}
        />
      ))}
    </div>
  );
}

/** Skill 46 — dashboard panels that straighten as they scroll into view. */
export function PerspectiveDeck({
  panels,
  className = "",
}: {
  panels: ReactNode[];
  className?: string;
}) {
  return (
    <div className={`nf-deck ${className}`}>
      {panels.map((panel, i) => (
        <DeckPanel key={i} delay={i * 120}>
          {panel}
        </DeckPanel>
      ))}
    </div>
  );
}

function DeckPanel({ children, delay }: { children: ReactNode; delay: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="nf-deck-panel"
      data-shown={inView || undefined}
      style={{ ["--nf-delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Skill 52 — scroll-linked storytelling driven by IntersectionObserver. */
export function ScrollStory({
  steps,
  className = "",
}: {
  steps: { title: string; body: string }[];
  className?: string;
}) {
  return (
    <ol className={className} style={{ display: "grid", gap: "0.75rem", margin: 0, padding: 0 }}>
      {steps.map((step, i) => (
        <StoryStep key={step.title} index={i} title={step.title} body={step.body} />
      ))}
    </ol>
  );
}

function StoryStep({ index, title, body }: { index: number; title: string; body: string }) {
  const { ref, inView } = useInView<HTMLLIElement>({ once: false, threshold: 0.5 });
  return (
    <li
      ref={ref}
      className="nf-reveal"
      data-variant="inline"
      data-shown={inView || undefined}
      style={{
        listStyle: "none",
        borderInlineStart: "1px solid var(--nf-line)",
        paddingInlineStart: "0.9rem",
        opacity: inView ? 1 : 0.35,
      }}
    >
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
        <span className="nf-number">{String(index + 1).padStart(2, "0")}</span>
        <strong style={{ fontSize: 13 }}>{title}</strong>
      </div>
      <p style={{ margin: "0.2rem 0 0", fontSize: 12, opacity: 0.6 }}>{body}</p>
    </li>
  );
}

/** Skill 69 — rotating radial rings as a sculptural hero motif. */
export function KineticRadial({
  rings = 4,
  size = 180,
  className = "",
  children,
}: {
  rings?: number;
  size?: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`nf-kinetic-radial ${className}`}
      style={{ width: size, height: size }}
      data-nf="kinetic-radial"
    >
      {Array.from({ length: rings }, (_, i) => (
        <i
          key={i}
          aria-hidden
          style={{
            ["--nf-ring-index" as string]: i,
            ["--nf-ring-dir" as string]: i % 2 ? "reverse" : "normal",
          }}
        />
      ))}
      {children}
    </div>
  );
}

/**
 * Skill 6 — GSAP-style timeline built on the Web Animations API.
 * Returns a ref; children are animated with an overlapping stagger.
 */
export function Timeline({
  children,
  stagger = 90,
  className = "",
}: {
  children: ReactNode;
  stagger?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !inView || reduced) return;
    const targets = Array.from(root.children) as HTMLElement[];
    const animations = targets.map((el, i) =>
      el.animate(
        [
          { opacity: 0, transform: "translateY(16px) scale(0.98)", filter: "blur(8px)" },
          { opacity: 1, transform: "none", filter: "blur(0px)" },
        ],
        {
          duration: 620,
          delay: i * stagger,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        }
      )
    );
    return () => animations.forEach((a) => a.cancel());
  }, [inView, reduced, stagger]);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={className}
    >
      {children}
    </div>
  );
}
