"use client";

/**
 * FLOATING NAV
 *
 * A translucent pill docked at the bottom. Three destinations, because the app
 * only has three: the grid you browse, the map you drift on, and the curators
 * the substrate is calibrated against.
 *
 * `usePathname` rather than props, so any page gets correct `aria-current`
 * without threading its own route down.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Discover", icon: GridIcon },
  { href: "/collections", label: "Collections", icon: MapIcon },
  { href: "/curators", label: "Curators", icon: PeopleIcon },
];

export function FloatingNav() {
  const pathname = usePathname();

  return (
    <nav className="cx-nav" aria-label="Primary">
      {ITEMS.map((item) => {
        // Exact match for the root; prefix match elsewhere so a collection
        // detail page still highlights its section. `/collection/x` is matched
        // by the `/collections` tab deliberately — the singular route is the
        // detail view of the plural one.
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href) ||
              (item.href === "/collections" && pathname.startsWith("/collection/")) ||
              (item.href === "/curators" && pathname.startsWith("/curator/"));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="cx-nav-item"
            aria-current={active ? "page" : undefined}
          >
            <Icon />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function GridIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="8" height="10" rx="1.5" />
      <rect x="13" y="3" width="8" height="6" rx="1.5" />
      <rect x="3" y="15" width="8" height="6" rx="1.5" />
      <rect x="13" y="11" width="8" height="10" rx="1.5" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="7" r="2.4" fill="currentColor" />
      <circle cx="18" cy="17" r="2.4" fill="currentColor" />
      <path
        d="M7.6 8.6C10 11 12 13 16.4 15.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeDasharray="2 2.6"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="8" r="3.4" />
      <circle cx="17" cy="9.5" r="2.6" />
      <path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2z" />
      <path d="M17 13.6c2.7 0 4.5 1.9 4.5 4.4H17z" />
    </svg>
  );
}
