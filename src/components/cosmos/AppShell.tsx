"use client";

/**
 * App chrome: 244px sidebar on desktop, bottom tabs on mobile, mini-player always.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLibrary } from "@/context/LibraryContext";
import { MiniPlayer } from "./MiniPlayer";
import {
  ArtistsIcon,
  BrowseIcon,
  LibraryIcon,
  ListenIcon,
  RadioIcon,
  ResonantMark,
} from "./icons";

const ITEMS = [
  { href: "/", label: "Listen Now", icon: ListenIcon },
  { href: "/collections", label: "Browse", icon: BrowseIcon },
  { href: "/radio", label: "Radio", icon: RadioIcon },
  { href: "/library", label: "Library", icon: LibraryIcon },
  { href: "/curators", label: "Artists", icon: ArtistsIcon, desktopOnly: true },
];

function activeFor(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/collections") return pathname.startsWith("/collection");
  if (href === "/curators") return pathname.startsWith("/curator");
  if (href === "/radio") return pathname.startsWith("/radio") || pathname.startsWith("/drift");
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connected, syncing, connect } = useLibrary();

  return (
    <div className="cx-shell">
      <aside className="cx-sidebar" aria-label="Primary">
        <Link href="/" className="cx-brand">
          <span className="cx-brand-mark">
            <ResonantMark />
          </span>
          <span className="cx-brand-name">Resonant</span>
        </Link>

        <nav className="cx-side-nav">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeFor(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="cx-side-link"
                aria-current={active ? "page" : undefined}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="cx-side-foot">
          {!connected && (
            <button
              type="button"
              className="cx-pill cx-pill-primary w-full"
              onClick={() => void connect()}
              disabled={syncing}
            >
              {syncing ? "Connecting…" : "Connect Apple Music"}
            </button>
          )}
          <Link href="/signature" className="cx-label px-2 hover:underline">
            About Resonant
          </Link>
        </div>
      </aside>

      <div className="cx-main">{children}</div>

      <div className="cx-player">
        <MiniPlayer />
      </div>

      <nav className="cx-tabbar" aria-label="Primary">
        {ITEMS.filter((item) => !item.desktopOnly).map((item) => {
          const Icon = item.icon;
          const active = activeFor(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="cx-tab"
              aria-current={active ? "page" : undefined}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
