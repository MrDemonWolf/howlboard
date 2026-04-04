# HowlBoard - Self-Hosted Collaborative Whiteboard

HowlBoard is a self-hosted whiteboard application built on
[Excalidraw](https://excalidraw.com) and powered by Cloudflare Workers.
It provides persistent storage, real-time collaboration, share links,
and an admin dashboard while keeping your data under your control.

Your boards. Your infrastructure. Your rules.

## Features

- **Excalidraw Editor** - Full-featured drawing canvas with shapes, text, freehand, and more via the Excalidraw engine.
- **Persistent Storage** - Drawings saved to Cloudflare R2 with automatic debounced saving (up to 10 MB per scene).
- **Authentication** - Email/password with optional TOTP two-factor authentication via Better Auth. First registered user automatically becomes admin.
- **Share Links** - Generate view or edit links with optional expiration dates and max-use limits.
- **Collections** - Organize boards into color-coded folders.
- **Board Search** - Filter boards by title from the dashboard.
- **Role-based Access** - Admin and viewer roles with protected routes.
- **Type-Safe API** - End-to-end type safety with tRPC from frontend to Cloudflare Workers backend.
- **Documentation Site** - Built-in docs powered by Fumadocs with full-text search via Orama.
- **Edge-Native** - Runs entirely on Cloudflare's edge network for low-latency access worldwide.

## Quick Start

```bash
# Clone and install
git clone https://github.com/mrdemonwolf/howlboard.git
cd howlboard
bun install

# Configure environment
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Set up database
bun db:generate
bun db:push

# Start development
bun dev
```

Open `http://localhost:3001` to access the web app. The first registered user becomes the admin.

## Architecture

```
┌─────────────┐     tRPC / HTTP      ┌──────────────────┐
│   React     │ ───────────────────► │   Hono Worker    │
│   Web App   │ ◄─────────────────── │   (Cloudflare)   │
│  (Vite)     │     JSON responses   │                  │
└─────────────┘                      └──────┬───┬───┬───┘
                                            │   │   │
                                   ┌────────┘   │   └────────┐
                                   ▼            ▼            ▼
                              ┌─────────┐ ┌─────────┐ ┌─────────┐
                              │   D1    │ │   R2    │ │   KV    │
                              │ (SQLite)│ │ (Blobs) │ │ (Cache) │
                              └─────────┘ └─────────┘ └─────────┘
                               Metadata    Scene JSON   Sessions
                               Users       Thumbnails
                               Boards
```

The React web app communicates with the API via tRPC. In development, Vite proxies `/trpc` requests to `localhost:3000`. The Hono Worker stores board metadata in D1 (SQLite), scene JSON in R2, and uses KV for caching.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 19 + TailwindCSS v4 |
| Editor | @excalidraw/excalidraw |
| API | Hono + tRPC on Cloudflare Workers |
| ORM | Drizzle ORM (D1 / SQLite) |
| Auth | Better Auth (email/password + TOTP 2FA) |
| Metadata DB | Cloudflare D1 |
| Drawing Storage | Cloudflare R2 |
| Cache | Cloudflare KV |
| Docs | Fumadocs + Next.js |
| Monorepo | Turborepo + Bun Workspaces |

## Project Structure

```
howlboard/
├── apps/
│   ├── api/              # Hono + tRPC Cloudflare Worker
│   ├── web/              # Vite + React 19 SPA (Excalidraw)
│   └── docs/             # Fumadocs + Next.js documentation
├── packages/
│   ├── api/              # tRPC router definitions
│   ├── auth/             # Better Auth configuration
│   ├── config/           # Shared TypeScript config
│   ├── db/               # Drizzle ORM schema + migrations
│   ├── env/              # Typed Cloudflare env bindings
│   └── shared/           # Shared types, Zod schemas, constants
├── turbo.json            # Turborepo task pipeline
├── package.json          # Root workspace configuration
└── .env.example          # Environment variable template
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | Secret key for signing sessions and tokens |
| `BETTER_AUTH_URL` | Yes | Base URL of the API (e.g., `http://localhost:3000`) |
| `CORS_ORIGIN` | Yes | URL of the web app (e.g., `http://localhost:3001`) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth 2.0 client secret |

Generate a secret with:

```bash
openssl rand -base64 32
```

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed automatically as a dev dependency)

### Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start all services (API :3000, Web :3001, Docs :3002) |
| `bun dev:web` | Start frontend only |
| `bun dev:api` | Start API worker only |
| `bun dev:docs` | Start docs site only |
| `bun build` | Build all packages and apps |
| `bun check-types` | Type-check entire monorepo |
| `bun db:generate` | Generate Drizzle migrations from schema changes |
| `bun db:push` | Push migrations to Cloudflare D1 |

### Code Quality

- TypeScript strict mode across all packages
- Shared base `tsconfig.json` via `@howlboard/config`
- Zod schemas for runtime validation (board title 255 chars, description 1000 chars, scene 10 MB)
- Type-safe end-to-end with tRPC

## Deployment

### 1. Create Cloudflare Resources

```bash
wrangler d1 create howlboard-db
wrangler r2 bucket create howlboard-drawings
wrangler kv namespace create CACHE
```

### 2. Configure wrangler.jsonc

Update `apps/api/wrangler.jsonc` with the resource IDs from step 1:

```jsonc
{
  "d1_databases": [{ "binding": "DB", "database_name": "howlboard-db", "database_id": "<your-id>" }],
  "r2_buckets": [{ "binding": "DRAWINGS_BUCKET", "bucket_name": "howlboard-drawings" }],
  "kv_namespaces": [{ "binding": "CACHE", "id": "<your-id>" }]
}
```

### 3. Set Production Secrets

```bash
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put BETTER_AUTH_URL
wrangler secret put CORS_ORIGIN
```

### 4. Deploy

```bash
# Deploy the API worker
cd apps/api && wrangler deploy

# Build the web app for static hosting
cd apps/web && bun run build
# Deploy dist/ to Cloudflare Pages or any static host
```

## License

![GitHub license](https://img.shields.io/github/license/mrdemonwolf/howlboard.svg?style=for-the-badge&logo=github)

## Contact

Have questions or feedback?

- Discord: [Join my server](https://mrdwolf.net/discord)

---

Made with love by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)
