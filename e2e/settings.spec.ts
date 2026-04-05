import { test, expect } from "@playwright/test";

test.describe("Settings Pages", () => {
  test("should display general settings with registration toggle", async ({
    page,
  }) => {
    await page.goto("/settings");

    await expect(page.getByText("Settings")).toBeVisible();
    await expect(page.getByText("Registration")).toBeVisible();

    const toggle = page.locator('button[role="switch"]');
    await expect(toggle.first()).toBeVisible();
  });

  test("should display profile page with user info", async ({ page }) => {
    await page.goto("/settings/profile");

    await expect(page.getByText("My Profile")).toBeVisible();
    await expect(page.getByText("Profile Picture")).toBeVisible();
    await expect(page.getByText("Username")).toBeVisible();
    await expect(page.getByText("Email")).toBeVisible();
  });

  test("should display members page", async ({ page }) => {
    await page.goto("/settings/members");

    await expect(page.getByText("Members")).toBeVisible();
  });

  test("should display legal editor", async ({ page }) => {
    await page.goto("/settings/legal");

    await expect(page.getByText("Legal Pages")).toBeVisible();
    await expect(page.getByText("Terms of Service")).toBeVisible();
    await expect(page.getByText("Privacy Policy")).toBeVisible();

    const editors = page.locator("textarea");
    await expect(editors.first()).toBeVisible();
  });

  test("should display collections page", async ({ page }) => {
    await page.goto("/settings/collections");

    await expect(page.getByText("Collections")).toBeVisible();
  });

  test("should navigate between settings sub-pages", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("link", { name: /profile/i }).click();
    await expect(page).toHaveURL(/\/settings\/profile/);

    await page.getByRole("link", { name: /legal/i }).click();
    await expect(page).toHaveURL(/\/settings\/legal/);
  });
});
