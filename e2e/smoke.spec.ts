import { test, expect } from "@playwright/test";

test("homepage renders the RESONANT experience", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/RESONANT/i);
  await expect(page.locator("body")).toBeVisible();
});

test("health endpoint reports ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.catalog.ok).toBe(true);
});

test("agent endpoint returns a recommendation reply", async ({ request }) => {
  const res = await request.post("/api/agent", {
    data: {
      message: "recommend something warm and melancholy",
      context: {
        compass: { warm: 0.6, sad: 0.5, organic: 0.5, energy: 0.35, dark: 0.5 },
        feedback: {},
        depth: 0.7,
      },
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(typeof body.reply).toBe("string");
  expect(body.reply.length).toBeGreaterThan(0);
});

test("agent endpoint validates input", async ({ request }) => {
  const res = await request.post("/api/agent", { data: { foo: "bar" } });
  expect(res.status()).toBe(400);
});
