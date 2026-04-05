import { test, expect } from "@playwright/test";

test.describe("Collections Page", () => {
  test("should display Collections heading", async ({ page }) => {
    await page.goto("/settings/collections");

    await expect(page.getByText("Collections")).toBeVisible();
  });

  test("should show new collection button (disabled — coming soon)", async ({
    page,
  }) => {
    await page.goto("/settings/collections");

    const button = page.getByRole("button", { name: /new collection/i });
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  });
});
