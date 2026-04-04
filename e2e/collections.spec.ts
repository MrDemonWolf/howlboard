import { test, expect } from "@playwright/test";

test.describe("Collections Page", () => {
  test("should display Collections heading on /settings/collections", async ({
    page,
  }) => {
    await page.goto("/settings/collections");

    if (page.url().includes("/login")) {
      test.skip(true, "Skipping — not authenticated");
      return;
    }

    // Collections heading should be visible
    await expect(
      page.getByRole("heading", { name: /collections/i }),
    ).toBeVisible();
  });

  test.skip("should create a new collection", async ({ page }) => {
    // Placeholder — API may not be wired up yet
    await page.goto("/settings/collections");

    if (page.url().includes("/login")) {
      return;
    }

    // Click create button
    await page
      .getByRole("button", { name: /create|add|new/i })
      .click();

    // Fill in collection name
    const nameInput = page.getByPlaceholder(/name|collection/i);
    await nameInput.fill("Test Collection");

    // Submit
    await page.getByRole("button", { name: /save|create|add/i }).click();

    // Verify it appears in the list
    await expect(page.getByText("Test Collection")).toBeVisible();
  });

  test.skip("should rename a collection", async ({ page }) => {
    // Placeholder — API may not be wired up yet
    await page.goto("/settings/collections");
  });

  test.skip("should delete a collection", async ({ page }) => {
    // Placeholder — API may not be wired up yet
    await page.goto("/settings/collections");
  });
});
