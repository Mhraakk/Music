import { test, expect } from "@playwright/test";

test.describe("Neuform design gallery", () => {
  test("renders every skill card with its category filters", async ({ page }) => {
    await page.goto("/design");
    await expect(page.getByRole("heading", { name: "Design skills" })).toBeVisible();
    await expect(page.locator("article[id]")).toHaveCount(71);
    await expect(page.getByText("Showing 71 of 71")).toBeVisible();
  });

  test("filters by category and by search", async ({ page }) => {
    await page.goto("/design");

    await page.getByRole("button", { name: /^WebGL/ }).click();
    // Retrying assertion: filtering re-renders asynchronously, so a captured
    // count can race the render under parallel load.
    await expect(page.locator("article[id]")).toHaveCount(14);

    await page.getByRole("button", { name: "All", exact: true }).click();
    await page.getByLabel("Search skills").fill("marquee");
    await expect(page.locator("article[id]")).toHaveCount(1);
    await expect(page.locator("#marquee-loop")).toBeVisible();
  });

  test("exposes the implementation record for a skill", async ({ page }) => {
    await page.goto("/design");
    await page.getByLabel("Search skills").fill("Progressive Blur");

    const card = page.locator("#progressive-blur");
    await card.getByRole("button", { name: "Implementation record" }).click();

    await expect(card.getByText("Performance", { exact: true })).toBeVisible();
    await expect(card.getByText("Accessibility", { exact: true })).toBeVisible();
    await expect(card.getByText("RTL", { exact: true })).toBeVisible();
  });

  test("mounts live WebGL surfaces without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/design");
    await page.getByRole("button", { name: /^WebGL/ }).click();
    await page.waitForTimeout(1200);

    const canvases = await page.locator("canvas").count();
    expect(canvases).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test("mirrors the layout when direction is switched to RTL", async ({ page }) => {
    await page.goto("/design");
    await page.getByRole("button", { name: "LTR" }).click();

    await expect(page.getByRole("button", { name: "RTL" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders content without animation and keeps cards visible", async ({ page }) => {
    await page.goto("/design");
    // Entrance animations must not leave content hidden.
    const firstCard = page.locator("article[id]").first();
    await expect(firstCard).toBeVisible();
    await expect(page.locator("#css-border-gradient")).toBeVisible();
  });
});

test.describe("skills applied to product surfaces", () => {
  test("home page shows the marquee and reveals the hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Listen by feeling/ })).toBeVisible();
    await expect(page.locator(".nf-marquee")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ask" })).toBeVisible();
  });
});
