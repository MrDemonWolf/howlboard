import { test, expect } from "@playwright/test";

// Setup tests run WITHOUT auth (use a fresh browser context)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Setup Page", () => {
  test("should display setup form with all fields", async ({ page }) => {
    await page.goto("/setup");

    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    await expect(page.getByPlaceholder("your-username")).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create.*account/i }),
    ).toBeVisible();
  });

  test("should show validation on empty submit", async ({ page }) => {
    await page.goto("/setup");

    await page.getByRole("button", { name: /create.*account/i }).click();

    const nameInput = page.getByPlaceholder("Your name");
    const isInvalid = await nameInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test("should auto-fill with ?dev=true", async ({ page }) => {
    await page.goto("/setup?dev=true");

    await expect(page.getByPlaceholder("you@example.com")).toHaveValue(
      "dev@howlboard.local",
      { timeout: 3000 },
    );
    await expect(page.getByPlaceholder("Your name")).toHaveValue("Dev Admin");
  });
});
