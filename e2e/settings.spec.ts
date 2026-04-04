import { test, expect } from "@playwright/test";

test.describe("Settings Pages", () => {
  test("should display registration toggle on /settings", async ({ page }) => {
    await page.goto("/settings");

    if (page.url().includes("/login")) {
      test.skip(true, "Skipping — not authenticated");
      return;
    }

    // Settings page should have a heading
    await expect(
      page.getByRole("heading", { name: /settings/i }),
    ).toBeVisible();

    // Registration toggle should be visible
    await expect(page.getByText(/registration/i)).toBeVisible();

    // There should be a toggle/switch or checkbox for registration
    const toggle = page.locator(
      'button[role="switch"], input[type="checkbox"]',
    );
    await expect(toggle.first()).toBeVisible();
  });

  test("should display user profile on /settings/profile", async ({
    page,
  }) => {
    await page.goto("/settings/profile");

    if (page.url().includes("/login")) {
      test.skip(true, "Skipping — not authenticated");
      return;
    }

    // Profile page should show the user's name
    await expect(page.getByText(/name/i)).toBeVisible();

    // Profile page should show the user's email
    await expect(page.getByText(/email/i)).toBeVisible();

    // There should be input fields or display text for name and email
    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(1);
  });

  test("should display TOS and Privacy editors on /settings/legal", async ({
    page,
  }) => {
    await page.goto("/settings/legal");

    if (page.url().includes("/login")) {
      test.skip(true, "Skipping — not authenticated");
      return;
    }

    // Legal page should have Terms of Service section
    await expect(
      page.getByText(/terms of service/i),
    ).toBeVisible();

    // Legal page should have Privacy Policy section
    await expect(
      page.getByText(/privacy/i),
    ).toBeVisible();

    // There should be textarea or rich-text editors for both
    const editors = page.locator("textarea, [contenteditable]");
    const editorCount = await editors.count();
    expect(editorCount).toBeGreaterThanOrEqual(2);
  });

  test("should navigate between settings sub-pages", async ({ page }) => {
    await page.goto("/settings");

    if (page.url().includes("/login")) {
      test.skip(true, "Skipping — not authenticated");
      return;
    }

    // Navigate to profile
    const profileLink = page.getByRole("link", { name: /profile/i });
    if (await profileLink.isVisible()) {
      await profileLink.click();
      await expect(page).toHaveURL(/\/settings\/profile/);
    }

    // Navigate to legal
    const legalLink = page.getByRole("link", { name: /legal/i });
    if (await legalLink.isVisible()) {
      await legalLink.click();
      await expect(page).toHaveURL(/\/settings\/legal/);
    }
  });
});
