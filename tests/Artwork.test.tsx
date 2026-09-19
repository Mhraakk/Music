import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Artwork } from "@/components/Artwork";
import { TRACKS } from "@/lib/tracks";

const track = TRACKS[0];

describe("<Artwork />", () => {
  it("renders the cover image with descriptive alt text", () => {
    render(<Artwork track={track} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", track.coverUrl);
    expect(img).toHaveAttribute("alt", `${track.album} — ${track.artist}`);
  });

  it("falls back to a generated gradient when the image fails to load", () => {
    render(<Artwork track={track} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders the gradient fallback when a track has no cover url", () => {
    render(<Artwork track={{ ...track, coverUrl: "" }} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
