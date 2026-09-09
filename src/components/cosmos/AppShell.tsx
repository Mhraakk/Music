"use client";

/**
 * Floating charcoal control pill on desktop, instrument tabbar on mobile.
 * Mini-player always. No skip.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLibrary } from "@/context/LibraryContext";
import { MiniPlayer } from "./MiniPlayer";
import {
  ArtistsIcon,
  AskIcon,
  BrowseIcon,
  LibraryIcon,
  ListenIcon,
  RadioIcon,
} from "./icons";

const ITEMS = [
  { href: "/", label: "Listen Now", icon: ListenIcon },
  { href: "/collections", label: "Browse", icon: BrowseIcon },
  { href: "/radio", label: "Radio", icon: RadioIcon },
  { href: "/talk", label: "Ask", icon: AskIcon },
  { href: "/library", label: "Library", icon: LibraryIcon },
  { href: "/curators", label: "Artists", icon: ArtistsIcon, desktopOnly: true },
];

function activeFor(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/collections") return pathname.startsWith("/collection");
  if (href === "/curators") return pathname.startsWith("/curator");
  if (href === "/radio") return pathname.startsWith("/radio") || pathname.startsWith("/drift");
  if (href === "/talk") return pathname.startsWith("/talk");
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connected, syncing, connect } = useLibrary();

  return (
    <div className="cx-shell">
      <div className="cx-main">
        <header className="cx-floatnav-wrap">
          <nav className="cx-floatnav" aria-label="Primary">
            <Link href="/" className="cx-brand">
              <span className="cx-brand-mark" aria-hidden>
                ///
              </span>
              <span className="cx-brand-name">Resonant</span>
            </Link>

            <div className="cx-floatnav-links">
              {ITEMS.map((item) => {
                const active = activeFor(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="cx-floatnav-link"
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="cx-floatnav-end">
              {!connected && (
                <button
                  type="button"
                  className="cx-pill cx-pill-primary"
                  onClick={() => void connect()}
                  disabled={syncing}
                >
                  {syncing ? "Connecting…" : "Connect Apple Music"}
                </button>
              )}
              <Link href="/signature" className="cx-floatnav-meta">
                About
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </div>

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
