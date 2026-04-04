import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: [
    {
      command:
        "rm -rf apps/api/.wrangler/state/v3/d1 && npx wrangler d1 migrations apply howlboard-db --local --config apps/api/wrangler.jsonc && bun run --filter api dev",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      cwd: ".",
    },
    {
      command: "bun run --filter web dev",
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
