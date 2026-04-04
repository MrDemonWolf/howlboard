# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Is HowlBoard

Self-hosted collaborative whiteboard app built on Excalidraw. Provides persistent storage, real-time collaboration, share links, and admin dashboards with full data control. Deployed on Cloudflare Workers/D1/R2/KV.

## Commands

All commands use **Bun** as the package manager (v1.3+).

```bash
# Development
bun dev          # Start all services concurrently
bun dev:web      # Frontend only (port 3001)
bun dev:api      # API worker only (port 3000)
bun dev:docs     # Documentation only (port 3002)

# Building & type checking
bun build        # Build all packages
bun check-types  # Type-check entire monorepo

# Database
bun db:generate  # Generate Drizzle migrations
bun db:push      # Push migrations to Cloudflare D1
```

## Architecture

Turborepo monorepo with Bun workspaces:

```
apps/
  api/      # Hono + tRPC Cloudflare Worker
  web/      # Vite + React 19 SPA
  docs/     # Fumadocs + Next.js docs site
packages/
  api/      # tRPC router definitions
  auth/     # Better Auth configuration (email/password + 2FA)
  db/       # Drizzle ORM schema + migrations (SQLite/D1)
  env/      # Typed Cloudflare environment bindings
  shared/   # Zod schemas, types, constants
  config/   # Shared TypeScript config
```

**Data flow:** React web app → tRPC client (via Vite proxy `/trpc` → `localhost:3000`) → Hono worker → D1 (metadata) + R2 (scene JSON)

## Key Architectural Decisions

- **Auth:** Better Auth with email/password and optional TOTP two-factor authentication. First registered user automatically becomes `owner`; all subsequent users default to `member` role.
- **Drawing storage:** Excalidraw scene JSON is stored in Cloudflare R2 (10MB limit per scene); board metadata (title, visibility, collection) is stored in D1.
- **Share links:** Token-based with optional expiration date and max-use limits. Public `getByShareToken` procedure bypasses auth.
- **tRPC procedures:** `protectedProcedure` requires an active session; `publicProcedure` is unauthenticated.

## Database Schema (packages/db)

Core tables: `user`, `session`, `account`, `verification`, `twoFactor`, `board`, `collection`, `shareLink`

- `board.visibility`: `private | public | shared`
- `board.sceneKey` / `thumbnailKey`: R2 object keys
- `shareLink.permission`: `view | edit`
- `user.role`: `owner | member`
- `user.twoFactorEnabled`: boolean, toggled by the 2FA plugin
- `account.password`: nullable, only set for `credential` (email/password) accounts

Boards belong to a collection (nullable, set null on delete). ShareLinks cascade-delete with their board.

## Shared Validation (packages/shared)

Zod schemas enforce: board title ≤ 255 chars, description ≤ 1000 chars, collection name ≤ 100 chars, scene ≤ 10MB.

## Environment Variables

See `.env.example` at repo root. Required vars:
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `CORS_ORIGIN` (set to web app URL)
