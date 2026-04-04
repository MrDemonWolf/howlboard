import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("should display the login form", async ({ page }) => {
    await page.goto("/login");

    // Verify the page heading
    await expect(
      page.getByRole("heading", { name: /howlboard|sign in/i }),
    ).toBeVisible();

    // Verify email and password fields
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();

    // Verify sign-in button
    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).toBeVisible();
  });

  test("should toggle between sign in and sign up modes", async ({ page }) => {
    await page.goto("/login");

    // Look for a toggle link to switch to sign-up mode
    const signUpLink = page.getByRole("button", {
      name: /sign up|create account|register/i,
    });

    if (await signUpLink.isVisible()) {
      await signUpLink.click();

      // In sign-up mode, a name field should appear
      await expect(page.getByPlaceholder("Your name")).toBeVisible();

      // And the submit button text should change
      await expect(
        page.getByRole("button", { name: /sign up|create account/i }),
      ).toBeVisible();
    }
  });

  test("should show validation on empty submit", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: /sign in/i }).click();

    // Email field should be invalid
    const emailInput = page.getByPlaceholder("you@example.com");
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    );
    expect(isInvalid).toBe(true);
  });

  test("should accept valid credentials input", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill("user@howlboard.dev");
    await page.getByPlaceholder("••••••••").fill("password123");

    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).toBeEnabled();
  });

  test("should redirect unauthenticated users to login", async ({ page }) => {
    // Try to access the dashboard without auth
    await page.goto("/");

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });
});
