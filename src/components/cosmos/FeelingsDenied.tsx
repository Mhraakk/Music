import Link from "next/link";

export function FeelingsDenied({
  id,
  atlasHref,
}: {
  id: string;
  atlasHref: string;
}) {
  return (
    <div className="cx-atlas">
      <p className="cx-kicker">
        <Link href="/feelings">Feelings</Link>
      </p>
      <h1 className="cx-atlas-display">
        Not in this <em>cut.</em>
      </h1>
      <p className="cx-body cx-atlas-lede">
        Atlas holds every Every Noise branch. Feelings only keeps the named rooms — lie back, soft warmth, warm-up,
        after hours, sunset, tender. <span className="cx-meta">{id}</span> stays on the mother map.
      </p>
      <Link href={atlasHref} className="cx-pill cx-pill-primary">
        Open on Atlas
      </Link>
    </div>
  );
}
