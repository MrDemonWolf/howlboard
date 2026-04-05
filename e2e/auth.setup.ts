import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "e2e/.auth/user.json";

setup("create admin account and authenticate", async ({ page }) => {
  // Navigate to setup with dev mode auto-fill
  await page.goto("/setup?dev=true");

  // Wait for form to auto-fill
  await expect(page.getByPlaceholder("you@example.com")).toHaveValue(
    "dev@howlboard.local",
    { timeout: 3000 },
  );

  // Submit the form
  await page.getByRole("button", { name: /create.*account/i }).click();

  // Wait for redirect to dashboard (full page reload via window.location.href)
  await page.waitForURL("/", { timeout: 15000 });

  // Save authenticated state
  await page.context().storageState({ path: AUTH_FILE });
});
