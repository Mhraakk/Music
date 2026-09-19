import type { Metadata } from "next";
import { SKILL_COUNT } from "@/design/skills";
import { DesignGallery } from "./DesignGallery";

export const metadata: Metadata = {
  title: "Design skills",
  description: `The Neuform design-intelligence library: ${SKILL_COUNT} skills mapped to routes and components across RESONANT.`,
};

export default function DesignPage() {
  return (
    <div className="relative min-h-dvh bg-[#050403]">
      <DesignGallery />
    </div>
  );
}
