# HowlBoard Deployment Guide

This guide walks you through deploying HowlBoard to Cloudflare Workers, Pages, D1, R2, and KV.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Bun](https://bun.sh) installed locally
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- GitHub repository (for CI/CD)

## Step 1: Create Cloudflare Resources

Run these commands from the project root:

```bash
# Authenticate with Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create howlboard-db

# Create R2 bucket
npx wrangler r2 bucket create howlboard-drawings

# Create KV namespace
npx wrangler kv namespace create CACHE

# Create Pages projects
npx wrangler pages project create howlboard-web
npx wrangler pages project create howlboard-docs
```

Save the IDs returned by each command — you'll need them in the next step.

## Step 2: Update Wrangler Config

Edit `apps/api/wrangler.jsonc` and replace the placeholder IDs in the `env.production` section:

```jsonc
"env": {
  "production": {
    "d1_databases": [{
      "binding": "DB",
      "database_name": "howlboard-db",
      "database_id": "<YOUR_D1_DATABASE_ID>"  // ← Replace this
    }],
    "kv_namespaces": [{
      "binding": "CACHE",
      "id": "<YOUR_KV_NAMESPACE_ID>"  // ← Replace this
    }]
  }
}
```

## Step 3: Set Production Secrets

```bash
# Generate a strong secret for auth
openssl rand -base64 32

# Set secrets on the Worker
npx wrangler secret put BETTER_AUTH_SECRET --env production
npx wrangler secret put BETTER_AUTH_URL --env production
# Enter: https://howlboard-api.<your-subdomain>.workers.dev

npx wrangler secret put CORS_ORIGIN --env production
# Enter: https://howlboard-web.pages.dev (or your custom domain)
```

## Step 4: Run Database Migrations

```bash
cd apps/api
npx wrangler d1 migrations apply howlboard-db --remote --env production
```

## Step 5: Add GitHub Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Create at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens). Needs permissions: Workers Scripts (Edit), Pages (Edit), D1 (Edit), R2 (Edit), KV (Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Found in the Cloudflare dashboard sidebar under your account |

## Step 6: Deploy

Push to `main` and the CI/CD pipeline will:

1. **Lint & type-check** the entire monorepo
2. **Run E2E tests** with Playwright
3. **Build** all packages
4. **Migrate** D1 database
5. **Deploy** API Worker to `howlboard-api.<subdomain>.workers.dev`
6. **Deploy** Web app to `howlboard-web.pages.dev`
7. **Deploy** Docs to `howlboard-docs.pages.dev`

```bash
git push origin main
```

## Custom Domains (Optional)

After the first deploy, you can add custom domains:

1. **API**: Cloudflare Dashboard → Workers → howlboard-api → Triggers → Custom Domains
2. **Web**: Cloudflare Dashboard → Pages → howlboard-web → Custom domains
3. **Docs**: Cloudflare Dashboard → Pages → howlboard-docs → Custom domains

Remember to update `BETTER_AUTH_URL` and `CORS_ORIGIN` secrets if you change domains.

## Troubleshooting

### "no such table" errors
Run migrations: `npx wrangler d1 migrations apply howlboard-db --remote --env production`

### CORS errors
Verify `CORS_ORIGIN` matches your web app URL exactly (including `https://`).

### Auth not working
Check that `BETTER_AUTH_URL` matches the API Worker URL and `BETTER_AUTH_SECRET` is set.

### Build failures in CI
Run `bun check-types` locally to check for type errors before pushing.
