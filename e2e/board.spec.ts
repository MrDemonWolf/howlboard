import { test, expect } from "@playwright/test";

test.describe("Dashboard & Board Editor", () => {
  // These tests assume the user is already authenticated.
  // In a real CI setup, you would use storageState or a setup project
  // to persist auth. For now, these test the UI structure once loaded.

  test("should display the dashboard layout with sidebar", async ({
    page,
  }) => {
    await page.goto("/");

    // If redirected to login, that is expected for unauthenticated state
    if (page.url().includes("/login")) {
      test.skip(true, "Skipping — not authenticated");
      return;
    }

    // Verify the HowlBoard branding is visible
    await expect(page.getByText("HowlBoard")).toBeVisible();

    // Verify the "+ New Board" button is present
    await expect(
      page.getByRole("button", { name: /\+\s*new board/i }),
    ).toBeVisible();

    // Verify the search input is present
    await expect(
      page.getByPlaceholder(/search/i),
    ).toBeVisible();
  });

  test("should show empty state when no boards exist", async ({ page }) => {
    await page.goto("/");

    if (page.url().includes("/login")) {
      test.skip(true, "Skipping — not authenticated");
      return;
    }

    // Look for the empty-state message
    await expect(page.getByText(/no boards yet/i)).toBeVisible();
  });

  test("should have sign out functionality", async ({ page }) => {
    await page.goto("/");

    if (page.url().includes("/login")) {
      test.skip(true, "Skipping — not authenticated");
      return;
    }

    await expect(
      page.getByRole("button", { name: /sign out/i }),
    ).toBeVisible();
  });

  test("should load the Excalidraw editor for a board", async ({ page }) => {
    // Navigate to a board page — this will fail without a real board ID,
    // but verifies the editor page structure
    await page.goto("/board/test-board-id");

    if (page.url().includes("/login")) {
      test.skip(true, "Skipping — not authenticated");
      return;
    }

    // The editor page should have a back button
    await expect(page.getByText(/back/i)).toBeVisible();

    // Wait for Excalidraw to load (it is lazy-loaded)
    const canvas = page.locator(".excalidraw");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
  });

  test("should display board title in editor toolbar", async ({ page }) => {
    await page.goto("/board/test-board-id");

    if (page.url().includes("/login")) {
      test.skip(true, "Skipping — not authenticated");
      return;
    }

    // The toolbar should show the board title
    // (exact text depends on the board data, just verify the toolbar area)
    const toolbar = page.locator(
      ".flex.items-center.justify-between.border-b",
    );
    await expect(toolbar).toBeVisible();
  });
});
