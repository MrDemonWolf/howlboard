import { test, expect } from "@playwright/test";

const ADMIN = {
  name: "Test Admin",
  email: "admin@howlboard.test",
  password: "testpassword123",
};

async function ensureLoggedIn(page: import("@playwright/test").Page) {
  // Create admin if needed
  await page.goto("/setup");
  if (page.url().includes("/setup")) {
    await page.getByPlaceholder("Your name").fill(ADMIN.name);
    await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
    await page.getByPlaceholder("••••••••").fill(ADMIN.password);
    await page.getByRole("button", { name: "Create admin account" }).click();
    await expect(page).not.toHaveURL("/setup", { timeout: 10000 });
  }

  // If not on dashboard, log in
  if (!page.url().endsWith("/") || page.url().includes("/login")) {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
    await page.getByPlaceholder("••••••••").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/", { timeout: 10000 });
  }
}

test.describe("Board operations", () => {
  test("dashboard loads after login", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/");
    await expect(page).toHaveURL("/");
  });

  test("local draw page loads without auth", async ({ page }) => {
    await page.goto("/draw");
    // Excalidraw canvas should load (it lazy-loads)
    await expect(page.locator(".excalidraw")).toBeVisible({ timeout: 15000 });
  });
});
