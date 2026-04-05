import { test, expect } from "@playwright/test";

// Login tests run WITHOUT auth
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login Page", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).toBeVisible();
  });

  test("should show validation on empty submit", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: /sign in/i }).click();

    const emailInput = page.getByPlaceholder("you@example.com");
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login|\/setup/);
  });
});
