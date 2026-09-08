"use client";

/**
 * SIGNATURE GALLERY
 *
 * One plate per viewport-height section, so each photograph is looked at rather
 * than scrolled past. The room takes the colour of whichever plate is centred.
 *
 * `IntersectionObserver` with a band across the middle of the viewport, not a
 * scroll listener: the browser computes intersection off the main thread, so
 * the tint follows the scroll without a handler firing on every frame. The band
 * is narrow (the middle 40%) so exactly one plate is ever "the current one",
 * which avoids the tint flickering between two as they cross.
 */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { SignaturePlate } from "@/lib/signature";
import { hexToRgb } from "@/lib/media";

/** Strong enough to read as the plate's own light without swallowing the image. */
const TINT_STRENGTH = 0.34;

export function SignatureGallery({ plates }: { plates: SignaturePlate[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number(entry.target.getAttribute("data-index"));
          if (!Number.isNaN(index)) setActiveIndex(index);
        }
      },
      // Only the middle band of the viewport counts as "being looked at".
      { rootMargin: "-30% 0px -30% 0px", threshold: 0 }
    );

    for (const section of sectionRefs.current) {
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".cosmos");
    if (!root) return;
    const { r, g, b } = hexToRgb(plates[activeIndex]?.tint ?? "#f2f0ed");
    root.style.setProperty("--tint", `${r} ${g} ${b}`);
    root.style.setProperty("--tint-strength", String(TINT_STRENGTH));

    return () => {
      // Leaving the gallery must not leave the whole app stained.
      root.style.setProperty("--tint-strength", "0");
    };
  }, [activeIndex, plates]);

  return (
    <div className="flex flex-col">
      {plates.map((plate, index) => (
        <section
          key={plate.slug}
          data-index={index}
          ref={(el) => {
            sectionRefs.current[index] = el;
          }}
          // Bottom padding clears the floating nav, which otherwise sits over
          // the caption of whichever plate is centred.
          className="flex min-h-[90vh] flex-col justify-center pb-28 pt-16"
        >
          <figure className="flex flex-col items-center">
            <div
              className="cx-plate"
              style={{
                // Reserved from the real dimensions, so nothing reflows on load.
                aspectRatio: `${plate.width} / ${plate.height}`,
                backgroundColor: plate.average,
              }}
            >
              <Image
                src={plate.src}
                alt={plate.title}
                fill
                sizes="(min-width: 1024px) 940px, 92vw"
                // The first plate is the largest thing above the fold.
                priority={index === 0}
                style={{ objectFit: "cover" }}
              />
            </div>

            <figcaption className="mt-6 w-full max-w-[52ch]">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="cx-heading">{plate.title}</h2>
                <span className="cx-mono shrink-0">
                  {String(index + 1).padStart(2, "0")} / {String(plates.length).padStart(2, "0")}
                </span>
              </div>

              <p className="cx-body mt-3">{plate.line}</p>

              {/*
                The plate read back in the engine's own terms. This is the point
                of placing the signature inside the ontology rather than beside
                it — the same numbers that rank a record describe a photograph.
              */}
              <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1">
                <div className="flex items-baseline gap-2">
                  <dt className="cx-label">Region</dt>
                  <dd className="cx-mono">{plate.regionLabel}</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="cx-label">Vulnerability</dt>
                  <dd className="cx-mono">{plate.avi.toFixed(2)}</dd>
                </div>
                <div className="flex items-baseline gap-2">
                  <dt className="cx-label">Cinematic space</dt>
                  <dd className="cx-mono">{plate.cinematic.toFixed(2)}</dd>
                </div>
              </dl>

              <p className="cx-label mt-2">{plate.shape}</p>
            </figcaption>
          </figure>
        </section>
      ))}
    </div>
  );
}
