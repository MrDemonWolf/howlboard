# HowlBoard - Self-Hosted Collaborative Whiteboard

HowlBoard is a self-hosted whiteboard application built on
Excalidraw and powered by Cloudflare Workers. It provides
persistent storage, real-time collaboration, share links,
and an admin dashboard while keeping your data under your
control.

Your boards. Your infrastructure. Your rules.

## Features

- **Excalidraw Editor** - Full-featured drawing canvas with
  shapes, text, freehand, and more via the Excalidraw engine.
- **Persistent Storage** - Drawings saved to Cloudflare R2
  with automatic debounced saving as you draw.
- **Google OAuth** - Secure authentication with first-user
  auto-admin assignment via Better Auth.
- **Share Links** - Generate view or edit links with optional
  expiration and usage limits.
- **Collections** - Organize boards into color-coded folders.
- **Board Search** - Filter boards by title from the dashboard.
- **Type-Safe API** - End-to-end type safety with tRPC from
  frontend to Cloudflare Workers backend.
- **Documentation Site** - Built-in docs powered by Fumadocs
  with full-text search via Orama.
- **Edge-Native** - Runs entirely on Cloudflare's edge network
  for low-latency access worldwide.

## Getting Started

Full documentation is available at `http://localhost:3002`
when running the dev server.

1. Clone the repository
2. Copy the environment template
3. Configure Google OAuth credentials
4. Install dependencies and start developing

See the **Development** section below for detailed steps.

## Tech Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Frontend        | Vite + React 19 + Tailwind CSS v4   |
| Editor          | @excalidraw/excalidraw              |
| API             | Hono + tRPC on Cloudflare Workers   |
| ORM             | Drizzle ORM (D1 / SQLite)           |
| Auth            | Better Auth with Google OAuth       |
| Metadata DB     | Cloudflare D1                       |
| Drawing Storage | Cloudflare R2                       |
| Cache           | Cloudflare KV                       |
| Docs            | Fumadocs + Next.js                  |
| Monorepo        | Turborepo + Bun Workspaces          |

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
  (installed automatically as a dev dependency)
- A Google Cloud project with OAuth 2.0 credentials

### Setup

1. Clone the repository:

```bash
git clone https://github.com/mrdemonwolf/howlboard.git
cd howlboard
```

2. Copy the environment template:

```bash
cp .env.example apps/api/.env
```

3. Fill in your environment variables in `apps/api/.env`:
   - `BETTER_AUTH_SECRET` - a random secret string
   - `GOOGLE_CLIENT_ID` - from Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - from Google Cloud Console

4. Install dependencies:

```bash
bun install
```

5. Start all services:

```bash
bun dev
```

This starts:
- **API** at `http://localhost:3000`
- **Web app** at `http://localhost:3001`
- **Docs** at `http://localhost:3002`

### Development Scripts

- `bun dev` - Start all apps concurrently via Turborepo
- `bun dev:web` - Start only the web frontend
- `bun dev:api` - Start only the API worker
- `bun dev:docs` - Start only the docs site
- `bun build` - Build all packages and apps
- `bun check-types` - Type-check all packages
- `bun db:push` - Push Drizzle schema changes to D1
- `bun db:generate` - Generate Drizzle migrations

### Code Quality

- TypeScript strict mode across all packages
- Shared base `tsconfig.json` via `@howlboard/config`
- Zod schemas for runtime validation
- Type-safe end-to-end with tRPC

## Project Structure

```
howlboard/
├── apps/
│   ├── api/              # Hono + tRPC Cloudflare Worker
│   ├── web/              # Vite + React 19 SPA
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

## License

![GitHub license](https://img.shields.io/github/license/mrdemonwolf/howlboard.svg?style=for-the-badge&logo=github)

## Contact

Have questions or feedback?

- Discord: [Join my server](https://mrdwolf.net/discord)

---

Made with love by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)
