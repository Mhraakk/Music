"use client";

import Image from "next/image";

/**
 * Apple sleeves go through next/image. Everything else is a plain img so a
 * Deezer / YouTube / SoundCloud host cannot red-screen the page.
 */
export function Artwork({
  src,
  sizes,
  className = "absolute inset-0 h-full w-full object-cover",
  loaded,
  priority = false,
  onLoad,
}: {
  src?: string | null;
  sizes: string;
  className?: string;
  loaded?: boolean;
  priority?: boolean;
  onLoad?: () => void;
}) {
  if (!src) return null;
  let host = "";
  try {
    host = new URL(src).hostname;
  } catch {
    host = "";
  }
  if (host.endsWith("mzstatic.com")) {
    return (
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        data-loaded={loaded ? "true" : "false"}
        onLoad={onLoad}
        onError={onLoad}
        style={{ objectFit: "cover" }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className}
      data-loaded={loaded ? "true" : "false"}
      onLoad={onLoad}
      onError={onLoad}
    />
  );
}
