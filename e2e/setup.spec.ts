import { test, expect } from "@playwright/test";

const ADMIN = {
  name: "Test Admin",
  email: "admin@howlboard.test",
  password: "testpassword123",
};

test.describe("Setup flow", () => {
  test("redirects to /setup when no users exist", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/setup");
    await expect(
      page.getByRole("heading", { name: "Set up HowlBoard" }),
    ).toBeVisible();
  });

  test("creates admin account and redirects to dashboard", async ({
    page,
  }) => {
    await page.goto("/setup");

    await page.getByPlaceholder("Your name").fill(ADMIN.name);
    await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
    await page.getByPlaceholder("••••••••").fill(ADMIN.password);
    await page.getByRole("button", { name: "Create admin account" }).click();

    // Should redirect to dashboard (or login, then dashboard)
    await expect(page).not.toHaveURL("/setup", { timeout: 10000 });
  });

  test("redirects away from /setup when setup is complete", async ({
    page,
  }) => {
    // First, create the admin user
    await page.goto("/setup");
    await page.getByPlaceholder("Your name").fill(ADMIN.name);
    await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
    await page.getByPlaceholder("••••••••").fill(ADMIN.password);
    await page.getByRole("button", { name: "Create admin account" }).click();
    await expect(page).not.toHaveURL("/setup", { timeout: 10000 });

    // Now revisit /setup — should redirect away
    await page.goto("/setup");
    await expect(page).not.toHaveURL("/setup", { timeout: 5000 });
  });
});
