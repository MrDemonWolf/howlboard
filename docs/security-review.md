# HowlBoard Security Review

**Date:** 2026-04-03
**Scope:** Backend API, authentication, data storage, input validation

## Summary

This review covers the HowlBoard backend stack: Hono API worker, tRPC routers, Better Auth configuration, and Drizzle ORM schema. The review identified several gaps and implemented fixes.

## Findings & Remediation

### 1. Missing Rate Limiting (HIGH)

**Before:** No rate limiting on any endpoint. Auth endpoints were vulnerable to brute-force attacks.

**After:** In-memory Map-based rate limiter added to `apps/api/src/index.ts`:
- Auth endpoints (`/api/auth/*`): 5 requests/minute per IP
- General API (`/trpc/*`): 60 requests/minute per IP
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) returned on every response
- 429 status returned when limit exceeded

**Note:** This is per-isolate on Cloudflare Workers. For cross-instance enforcement, migrate to Cloudflare KV or Durable Objects.

### 2. Incomplete Security Headers (MEDIUM)

**Before:** Only `Strict-Transport-Security` and `X-Content-Type-Options` were set.

**After:** Added to `apps/api/src/index.ts`:
- `X-Frame-Options: DENY` -- prevents clickjacking
- `X-XSS-Protection: 1; mode=block` -- legacy XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` -- limits referrer leakage
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` -- restricts browser APIs

### 3. Cookie Security Gap (LOW)

**Before:** Cookies lacked explicit `path` attribute, relying on browser defaults.

**After:** Added `path: "/"` to `packages/auth/src/index.ts` cookie config. Existing `httpOnly`, `secure` (production), and `sameSite: lax` were already correct.

### 4. Missing Scene Size Validation (MEDIUM)

**Before:** `saveDrawing` mutation accepted `z.string()` with no length limit, allowing arbitrarily large payloads to be written to R2.

**After:** Added `.max(LIMITS.MAX_SCENE_SIZE_BYTES)` (10MB) validation to the `data` field in `packages/api/src/routers/boards.ts`.

### 5. Input Validation Coverage (OK)

All tRPC mutations use Zod schemas from `@howlboard/shared`:
- `createBoardSchema` -- title length, description length, visibility enum
- `updateBoardSchema` -- same constraints, all optional
- `createCollectionSchema` / `updateCollectionSchema` -- name length, hex color regex
- `createShareLinkSchema` -- permission enum, datetime, positive integer
- All `delete` and `getById` operations validate `id` as `z.string()`

No gaps found in existing schema validation beyond the scene size issue (fixed above).

## Architecture Security Notes

- **Auth:** Better Auth with email/password. First user becomes admin. TOTP 2FA available.
- **CORS:** Strict origin check against `CORS_ORIGIN` env var.
- **Authorization:** All board/collection mutations verify `ownerId === session.user.id`.
- **Share links:** Token-based with expiration and max-use enforcement. Public procedure bypasses auth by design.

## Recommendations for Future Work

1. Migrate rate limiting to Cloudflare Durable Objects for cross-isolate consistency
2. Add CSRF token validation for state-changing auth operations
3. Implement audit logging for admin actions
4. Add Content-Security-Policy header (requires frontend coordination)
5. Consider adding request body size limits at the Hono level
