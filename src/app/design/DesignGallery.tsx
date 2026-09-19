"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DESIGN_SKILLS,
  SKILL_CATEGORIES,
  SKILL_COUNT,
  type DesignSkill,
  type SkillCategory,
} from "@/design/skills";
import { ContainerLines, NumberDetail, Reveal } from "@/components/neuform";
import { SkillDemo } from "./SkillDemo";

type Filter = SkillCategory | "All";

const FIELDS: { key: keyof DesignSkill; label: string }[] = [
  { key: "routes", label: "Route" },
  { key: "component", label: "Component" },
  { key: "mobile", label: "Mobile" },
  { key: "rtl", label: "RTL" },
  { key: "performance", label: "Performance" },
  { key: "accessibility", label: "Accessibility" },
  { key: "sourceFiles", label: "Source files" },
];

export function DesignGallery() {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [rtl, setRtl] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // The direction toggle proves every effect mirrors correctly.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("dir") ?? "ltr";
    root.setAttribute("dir", rtl ? "rtl" : "ltr");
    return () => root.setAttribute("dir", previous);
  }, [rtl]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DESIGN_SKILLS.filter((s) => {
      const matchesCategory = filter === "All" || s.category === filter;
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.slug.includes(q) ||
        s.purpose.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [filter, query]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of DESIGN_SKILLS) map.set(s.category, (map.get(s.category) ?? 0) + 1);
    return map;
  }, []);

  return (
    <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.3em] text-white/40">NEUFORM</p>
          <h1 className="display mt-1 text-3xl">Design skills</h1>
          <p className="mt-1 max-w-xl text-sm text-white/50">
            All {SKILL_COUNT} skills implemented as a design-intelligence library — each mapped to a
            route and component, never stacked on one screen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRtl((v) => !v)}
            aria-pressed={rtl}
            className="glass-2 glass-edge pressable rounded-full px-4 py-2 text-xs text-white/70"
          >
            {rtl ? "RTL" : "LTR"}
          </button>
          <Link
            href="/"
            className="glass-2 glass-edge pressable rounded-full px-4 py-2 text-xs text-white/70"
          >
            Back
          </Link>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <label htmlFor="skill-search" className="sr-only">
          Search skills
        </label>
        <input
          id="skill-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills…"
          className="glass-2 glass-edge w-56 rounded-full px-4 py-2 text-xs outline-none placeholder:text-white/30"
        />
        {(["All", ...SKILL_CATEGORIES] as Filter[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            aria-pressed={filter === cat}
            className={`pressable rounded-full px-3 py-1.5 text-[11px] transition ${
              filter === cat
                ? "bg-white/90 text-black"
                : "glass-2 glass-edge text-white/60 hover:text-white/85"
            }`}
          >
            {cat}
            {cat !== "All" && <span className="ms-1.5 text-white/30">{counts.get(cat) ?? 0}</span>}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-white/35" aria-live="polite">
        Showing {visible.length} of {SKILL_COUNT}
      </p>

      <ContainerLines className="mt-6 px-1">
        <ul className="grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((skill, i) => (
            <Reveal
              key={skill.slug}
              as="li"
              variant="blur"
              delay={Math.min(i, 8) * 45}
              className="glass-1 glass-edge nf-shadow-2 overflow-hidden rounded-2xl"
            >
              <article
                id={skill.slug}
                style={{ contentVisibility: "auto", containIntrinsicSize: "420px" }}
              >
                <div className="p-3">
                  <SkillDemo skill={skill} />
                </div>

                <div className="px-4 pb-4">
                  <div className="flex items-baseline gap-2">
                    <NumberDetail value={skill.id} />
                    <h2 className="text-sm font-semibold text-white/85">{skill.name}</h2>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/60">
                      {skill.category}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        skill.status === "implemented"
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-amber-400/15 text-amber-300"
                      }`}
                    >
                      {skill.status}
                    </span>
                    {skill.routes.map((r) => (
                      <span
                        key={r}
                        className="nf-ltr rounded-full bg-white/5 px-2 py-0.5 text-white/45"
                      >
                        {r}
                      </span>
                    ))}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-white/55">{skill.purpose}</p>

                  {skill.note && (
                    <p className="mt-2 rounded-lg bg-amber-400/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-200/80">
                      {skill.note}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === skill.slug ? null : skill.slug)}
                    aria-expanded={expanded === skill.slug}
                    aria-controls={`record-${skill.slug}`}
                    className="mt-3 text-[11px] text-white/45 underline-offset-4 hover:text-white/75 hover:underline"
                  >
                    {expanded === skill.slug ? "Hide record" : "Implementation record"}
                  </button>

                  {expanded === skill.slug && (
                    <dl
                      id={`record-${skill.slug}`}
                      className="mt-2 grid gap-1.5 border-t border-white/10 pt-2 text-[11px]"
                    >
                      {FIELDS.map((field) => {
                        const raw = skill[field.key];
                        const value = Array.isArray(raw) ? raw.join(", ") : String(raw);
                        // Routes, components and file paths are latin identifiers:
                        // isolate them so RTL never reorders their punctuation.
                        const isToken = ["Route", "Component", "Source files"].includes(
                          field.label
                        );
                        return (
                          <div key={field.label} className="grid grid-cols-[6.5rem_1fr] gap-2">
                            <dt className="text-white/35">{field.label}</dt>
                            <dd className={`m-0 text-white/60 ${isToken ? "nf-ltr" : ""}`}>
                              {value}
                            </dd>
                          </div>
                        );
                      })}
                      <div className="grid grid-cols-[6.5rem_1fr] gap-2">
                        <dt className="text-white/35">Source</dt>
                        <dd className="m-0">
                          <a
                            href={skill.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-white/55 underline-offset-4 hover:underline"
                          >
                            neuform.ai/{skill.slug}
                          </a>
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </ContainerLines>

      {visible.length === 0 && (
        <p className="mt-10 text-center text-sm text-white/40">No skills match that search.</p>
      )}
    </main>
  );
}
