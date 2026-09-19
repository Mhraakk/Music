import { describe, it, expect } from "vitest";
import {
  catalogIntegrity,
  verifyTrackId,
  verifyArtistTitle,
  verifyTrackList,
} from "@/lib/agent/verify";
import { TRACKS } from "@/lib/tracks";

describe("catalogIntegrity", () => {
  it("reports a healthy, duplicate-free catalog", () => {
    const result = catalogIntegrity();
    expect(result.ok).toBe(true);
    expect(result.size).toBe(TRACKS.length);
    expect(result.uniqueIds).toBe(TRACKS.length);
    expect(result.duplicateIds).toHaveLength(0);
  });
});

describe("verifyTrackId", () => {
  it("resolves an existing id", () => {
    expect(verifyTrackId(TRACKS[0].id)?.id).toBe(TRACKS[0].id);
  });
  it("returns null for unknown or empty ids", () => {
    expect(verifyTrackId("does-not-exist")).toBeNull();
    expect(verifyTrackId(undefined)).toBeNull();
    expect(verifyTrackId(null)).toBeNull();
  });
});

describe("verifyArtistTitle", () => {
  it("matches on normalized artist + title", () => {
    const t = TRACKS[0];
    expect(verifyArtistTitle(t.artist.toUpperCase(), `  ${t.title}  `)?.id).toBe(t.id);
  });
});

describe("verifyTrackList", () => {
  it("separates verified from dropped ids", () => {
    const { verified, dropped } = verifyTrackList([{ id: TRACKS[0].id }, { id: "ghost" }]);
    expect(verified).toHaveLength(1);
    expect(dropped).toEqual(["ghost"]);
  });
});
