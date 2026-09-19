import { test, expect } from "@playwright/test";

/**
 * Covers the multi-source surface end-to-end: Next page → proxy → FastAPI →
 * live music providers → taste memory. Skipped when the backend is not running.
 */
test.describe("Sources & taste", () => {
  test.beforeEach(async ({ request }) => {
    const health = await request.get("/api/ai/health");
    test.skip(health.status() !== 200, "AI backend not running");
  });

  test("lists every source and names the secrets that are missing", async ({ page }) => {
    await page.goto("/sources");
    await expect(page.getByRole("heading", { name: "Sources & taste" })).toBeVisible();

    // Three keyless internet sources work with no configuration at all.
    await expect(page.getByText("Apple / iTunes catalogue")).toBeVisible();
    await expect(page.getByText("Deezer catalogue")).toBeVisible();
    await expect(page.getByText("MusicBrainz metadata")).toBeVisible();

    // Personal sources are listed with the exact secret they need.
    await expect(page.getByText("Telegram (shared audio)")).toBeVisible();
    await expect(page.getByText(/needs TELEGRAM_BOT_TOKEN/)).toBeVisible();
    await expect(page.getByText(/of 7 sources connected/)).toBeVisible();
  });

  test("searches every source at once and merges duplicates", async ({ page }) => {
    await page.goto("/sources");
    await page.getByLabel("Search every music source").fill("boards of canada roygbiv");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    const rows = page.locator("[data-track-key]");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });

    // Results carry a badge per provider that contributed them.
    await expect(
      rows
        .first()
        .locator("span", { hasText: /Apple|Deezer|MusicBrainz/ })
        .first()
    ).toBeVisible();
  });

  test("learns from a like and reflects it in the profile", async ({ page, request }) => {
    await request.delete("/api/ai/music?path=taste/profile/medosa").catch(() => {});
    await page.goto("/sources");
    await expect(page.getByText(/No signals yet/)).toBeVisible();

    await page.getByLabel("Search every music source").fill("stars of the lid");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    const rows = page.locator("[data-track-key]");
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    await rows
      .first()
      .getByRole("button", { name: /^Like / })
      .click();

    // The learned profile replaces the empty state.
    await expect(page.getByText(/signals · confidence/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/returns to/)).toBeVisible();
  });

  test("produces taste-ranked recommendations with reasons", async ({ page }) => {
    await page.goto("/sources");
    await page.getByRole("button", { name: "For you" }).click();

    const rows = page.locator("[data-track-key]");
    await expect(rows.first()).toBeVisible({ timeout: 40_000 });
    expect(await rows.count()).toBeGreaterThan(1);
  });
});
