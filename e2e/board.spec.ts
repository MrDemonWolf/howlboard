import { test, expect } from "@playwright/test";

test.describe("Dashboard & Board Editor", () => {
  test("should display dashboard with sidebar", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /\+\s*new board/i }),
    ).toBeVisible();
  });

  test("should create a new board and open editor", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /\+\s*new board/i }).click();

    // Should navigate to /board/:id
    await expect(page).toHaveURL(/\/board\//, { timeout: 10000 });

    // Excalidraw should load
    await expect(page.locator(".excalidraw")).toBeVisible({ timeout: 15000 });
  });

  test("should show empty state when no boards exist", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/no boards yet/i)).toBeVisible();
  });

  test("should load local draw page without auth", async ({ page }) => {
    await page.goto("/draw");

    await expect(page.locator(".excalidraw")).toBeVisible({ timeout: 15000 });
  });
});
