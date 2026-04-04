import { test, expect } from "@playwright/test";

const ADMIN = {
  name: "Test Admin",
  email: "admin@howlboard.test",
  password: "testpassword123",
};

test.describe("Login flow", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure admin account exists via the setup page
    await page.goto("/setup");
    // If redirected away, setup is already done
    if (page.url().includes("/setup")) {
      await page.getByPlaceholder("Your name").fill(ADMIN.name);
      await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
      await page.getByPlaceholder("••••••••").fill(ADMIN.password);
      await page.getByRole("button", { name: "Create admin account" }).click();
      await expect(page).not.toHaveURL("/setup", { timeout: 10000 });
    }
  });

  test("redirects unauthenticated users to /login", async ({ page }) => {
    // Clear cookies to ensure logged out
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page).toHaveURL("/login", { timeout: 10000 });
  });

  test("logs in with valid credentials", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill(ADMIN.email);
    await page.getByPlaceholder("••••••••").fill(ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should end up on dashboard
    await expect(page).toHaveURL("/", { timeout: 10000 });
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill("wrong@email.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator(".text-red-400")).toBeVisible({ timeout: 5000 });
  });
});
