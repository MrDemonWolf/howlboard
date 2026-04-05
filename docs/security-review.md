# HowlBoard Security Review

**Date:** 2026-04-04
**Reviewer:** Automated security audit (Claude)
**Scope:** All backend (API, auth, DB schema) and frontend (React SPA) source code
**Commit:** main branch, current HEAD

---

## Executive Summary

HowlBoard demonstrates a solid security foundation: cookies are httpOnly with SameSite=lax, CORS is origin-locked, security headers are comprehensive, ownership checks are consistently applied on board/collection mutations, and input validation uses Zod schemas throughout. However, several findings require attention, including unauthenticated data exposure, XSS via `dangerouslySetInnerHTML`, weak rate limiting, missing Content-Security-Policy, and avatar upload content-type bypass risks.

**Finding counts:** 2 CRITICAL, 4 HIGH, 7 MEDIUM, 5 LOW

---

## Findings

### CRITICAL

#### C-1: Unauthenticated Thumbnail Access (IDOR)

- **Severity:** CRITICAL
- **Location:** `packages/api/src/routers/boards.ts` lines 235-256 (`getThumbnail`)
- **Description:** The `getThumbnail` procedure uses `publicProcedure` and accepts any board ID without ownership or visibility checks. Any unauthenticated user can enumerate board IDs and retrieve thumbnail images for private boards, leaking visual content.
- **Recommendation:** Change to `protectedProcedure` and add an ownership check, or at minimum verify the board's visibility is `public` or `shared` before returning the thumbnail. If thumbnails must be publicly accessible for share links, add a dedicated `getThumbnailByShareToken` procedure instead.

#### C-2: Share Link Exposes Internal Board ID and Lacks Write-Back Endpoint

- **Severity:** CRITICAL
- **Location:** `packages/api/src/routers/boards.ts` lines 311-370 (`getByShareToken`)
- **Description:** The `getByShareToken` procedure returns `permission: "edit"` and the full scene data, but no corresponding `saveDrawingByShareToken` procedure exists. The shared board page loads Excalidraw with `viewModeEnabled={isReadOnly}` (shared-board.tsx line 81), but if a share link grants `edit` permission, the user sees an editable canvas with no way to persist changes through a legitimate endpoint. More critically, the response includes the internal `board.id` (line 366), which combined with C-1 allows unauthenticated enumeration of private board thumbnails.
- **Recommendation:** Either (a) implement a `saveDrawingByShareToken` procedure that validates the token and permission before allowing writes, or (b) remove `edit` permission from share links until a secure write path exists. Remove `board.id` from the `getByShareToken` response.

---

### HIGH

#### H-1: XSS via dangerouslySetInnerHTML in Markdown Renderer

- **Severity:** HIGH
- **Location:** `apps/web/src/components/markdown-renderer.tsx` lines 30-45
- **Description:** The `MarkdownRenderer` component uses `dangerouslySetInnerHTML` for list items (line 31-33) and paragraphs (line 40-42). While the `renderInline` function calls `escapeHtml` before applying the bold regex, this architecture is fragile: any additional inline formatting patterns (links, images, code spans) added in the future could easily introduce XSS. The admin-editable legal pages (TOS/Privacy) flow through this renderer, meaning a compromised admin account or stored XSS in the `appSettings` table could execute JavaScript for all visitors.
- **Recommendation:** Replace the custom markdown renderer with a battle-tested library (e.g., `react-markdown` with `rehype-sanitize`) or use React's native text rendering without `dangerouslySetInnerHTML`. If the custom renderer must stay, add a final HTML sanitization pass (e.g., DOMPurify) after all inline transformations.

#### H-2: Avatar Upload Has No Content Validation

- **Severity:** HIGH
- **Location:** `packages/api/src/routers/settings.ts` lines 174-198 (`uploadAvatar`)
- **Description:** The avatar upload accepts a base64 string up to 3MB and stores it in R2 with `contentType: "image/png"` regardless of actual content. There is no server-side validation that the decoded data is actually a PNG image. A malicious user could upload HTML, SVG (with embedded JavaScript), or other content types. If these R2 objects are ever served directly (e.g., through a CDN or public bucket), they could be interpreted as executable content by browsers.
- **Recommendation:** Validate the decoded buffer's magic bytes (PNG: `\x89PNG\r\n\x1a\n`) on the server before storing. Consider also validating image dimensions. Set `Content-Disposition: inline` explicitly only for validated images.

#### H-3: Scene Import Has No Server-Side Content Validation

- **Severity:** HIGH
- **Location:** `packages/api/src/routers/boards.ts` lines 390-416 (`importScene`)
- **Description:** The `importScene` procedure accepts a string up to 10MB and stores it directly in R2 as JSON without validating that it is valid JSON or a valid Excalidraw scene structure. The frontend does a basic `parsed.type !== "excalidraw"` check (editor.tsx line 252), but the server has no such validation. An attacker can store arbitrary data in R2.
- **Recommendation:** Add server-side validation: parse the JSON, verify `type === "excalidraw"`, verify `elements` is an array, and enforce structural constraints before storing in R2.

#### H-4: Frontend Admin Pages Lack Role Guards

- **Severity:** HIGH
- **Location:** `apps/web/src/pages/settings/index.tsx`, `apps/web/src/pages/settings/legal.tsx`, `apps/web/src/pages/settings/members.tsx`
- **Description:** The Settings page renders admin-only controls (registration toggle) to all authenticated users. While the backend `adminProcedure` correctly rejects unauthorized mutations, the UI shows admin controls to non-owner members. This is a defense-in-depth gap: users see controls they cannot use, and a frontend-only attacker (e.g., browser extension modifying JS) could be misled about authorization boundaries.
- **Recommendation:** Add frontend role guards: check `session.user.role === "owner"` before rendering admin-only pages/controls. Consider creating a shared `AdminGuard` component similar to `AuthGuard`.

---

### MEDIUM

#### M-1: Rate Limiting Is Per-Isolate Only (Easily Bypassed)

- **Severity:** MEDIUM
- **Location:** `apps/api/src/index.ts` lines 22-61 (in-memory rate limit store)
- **Description:** The rate limiter uses an in-memory `Map` scoped to a single Cloudflare Worker isolate. Since Workers can spin up multiple isolates, the rate limit is trivially bypassed. The auth endpoint allows 20 requests per 60 seconds, but only per-isolate.
- **Recommendation:** Migrate to Cloudflare KV or Durable Objects for rate limit state, or use Cloudflare's built-in Rate Limiting rules at the edge.

#### M-2: No Content-Security-Policy Header

- **Severity:** MEDIUM
- **Location:** `apps/api/src/index.ts` lines 66-80 (security headers middleware)
- **Description:** The API sets good security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) but does not set a `Content-Security-Policy` header. Inline scripts and arbitrary resource loading are unrestricted, reducing defense-in-depth against XSS.
- **Recommendation:** Add a CSP header. At minimum: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'`. Adjust for Excalidraw's requirements.

#### M-3: Email Verification Disabled

- **Severity:** MEDIUM
- **Location:** `packages/auth/src/index.ts` line 21 (`requireEmailVerification: false`)
- **Description:** Email verification is explicitly disabled. Anyone can register with any email address (when registration is open), enabling impersonation or accounts with invalid emails.
- **Recommendation:** Enable email verification, or document as an accepted risk for self-hosted deployments where the admin controls registration.

#### M-4: No Server-Side Password Strength Enforcement

- **Severity:** MEDIUM
- **Location:** `packages/auth/src/index.ts` (Better Auth config); `apps/web/src/pages/login.tsx` line 147
- **Description:** The only password requirement is `minLength={8}` on the frontend HTML input. There is no server-side password strength validation. An attacker bypassing the frontend could set `aaaaaaaa` as a password.
- **Recommendation:** Add server-side password validation in Better Auth config or via a `databaseHooks` pre-create check. Consider complexity requirements or a library like `zxcvbn`.

#### M-5: Owner Account Deletion Not Prevented

- **Severity:** MEDIUM
- **Location:** `packages/api/src/routers/settings.ts` lines 121-141 (`deleteAccount`)
- **Description:** The `deleteAccount` procedure allows any authenticated user to delete their account, including the sole owner. If the owner deletes their account, the instance becomes unmanageable -- no user can access admin functions, and registration may be disabled.
- **Recommendation:** Prevent the last owner from deleting their account, or require ownership transfer first.

#### M-6: CSRF Protection Relies Solely on SameSite Cookies

- **Severity:** MEDIUM
- **Location:** `packages/auth/src/index.ts` line 25 (`sameSite: "lax"`)
- **Description:** CSRF protection relies entirely on `SameSite=lax` cookies. While this is effective for modern browsers, it does not protect against top-level navigation attacks (GET-based state changes). Better Auth's auth endpoints accept both GET and POST (`app.on(["POST", "GET"], "/api/auth/*"` in `apps/api/src/index.ts` line 124), which means auth state changes via GET are possible under `SameSite=lax`.
- **Recommendation:** Restrict auth state-changing operations to POST only. Consider adding a CSRF token for defense-in-depth, especially for the auth endpoints.

#### M-7: Share Link Use Count Incremented on Every View

- **Severity:** MEDIUM
- **Location:** `packages/api/src/routers/boards.ts` lines 329-341
- **Description:** The `getByShareToken` procedure increments `useCount` on every access, even repeated views by the same user. A legitimate user refreshing the page will exhaust `maxUses` quickly. This is a denial-of-service vector against share links.
- **Recommendation:** Consider tracking unique views (e.g., by IP or session) rather than total accesses, or only count the initial load.

---

### LOW

#### L-1: CORS Origin Falls Back to localhost

- **Severity:** LOW
- **Location:** `apps/api/src/index.ts` line 87
- **Description:** If `CORS_ORIGIN` is not set, the CORS middleware falls back to `http://localhost:3001`. This is fine for development but is a misconfiguration risk in production.
- **Recommendation:** In production, fail closed: if `CORS_ORIGIN` is not set, reject all cross-origin requests.

#### L-2: X-XSS-Protection Header Is Deprecated

- **Severity:** LOW
- **Location:** `apps/api/src/index.ts` line 74
- **Description:** The `X-XSS-Protection: 1; mode=block` header is deprecated and can introduce vulnerabilities in older browsers. Modern browsers have removed XSS auditors.
- **Recommendation:** Remove the header or set it to `0`. Rely on CSP instead.

#### L-3: Thumbnail and Avatar Magic Bytes Not Validated

- **Severity:** LOW
- **Location:** `packages/api/src/routers/boards.ts` line 220 (`saveThumbnail`); `packages/api/src/routers/settings.ts` line 190 (`uploadAvatar`)
- **Description:** Both thumbnail and avatar uploads decode base64 and store with `image/png` content type without verifying the data is actually PNG.
- **Recommendation:** Validate PNG magic bytes (`\x89PNG\r\n\x1a\n`) on decoded buffers before storing.

#### L-4: Library Data Not Validated

- **Severity:** LOW
- **Location:** `packages/api/src/routers/boards.ts` lines 373-381 (`saveLibrary`)
- **Description:** The `saveLibrary` procedure accepts up to 5MB of arbitrary string data and stores it in R2 as JSON without validating structure.
- **Recommendation:** Parse and validate the JSON structure before storing.

#### L-5: Setup Page Dev Mode Credentials in Production Bundle

- **Severity:** LOW
- **Location:** `apps/web/src/pages/setup.tsx` lines 14, 24-31
- **Description:** The setup page has a dev mode (`?dev=true` on localhost) that auto-fills with default credentials (`dev@howlboard.local` / `password123`). While gated to localhost, these credentials are visible in the production JavaScript bundle.
- **Recommendation:** Strip dev-mode code from production builds using build-time environment variables or conditional compilation (e.g., Vite's `import.meta.env.DEV`).

---

## Positive Security Observations

1. **Session handling:** Better Auth with httpOnly, SameSite=lax cookies and conditional Secure flag is well configured.
2. **Ownership checks:** All board and collection mutations consistently verify `ownerId === ctx.session.user.id`.
3. **Soft delete:** Board deletion is a two-step process (soft delete then permanent delete), reducing accidental data loss.
4. **CORS:** Origin-locked CORS with credentials, restricted to a single allowed origin.
5. **Security headers:** HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, strict Referrer-Policy, and restrictive Permissions-Policy are all set.
6. **Input validation:** Zod schemas enforce size limits on titles (255 chars), descriptions (1000 chars), scenes (10MB), thumbnails (500KB), avatars (3MB), and legal content (100KB).
7. **Share link tokens:** 32-character nanoid tokens provide approximately 192 bits of entropy, which is excellent.
8. **Share link expiration:** Proper expiration and max-use checks with atomic use count increment.
9. **2FA support:** TOTP two-factor authentication is available via Better Auth plugin.
10. **Registration control:** Registration can be disabled by the admin; the database hook enforces this server-side.
11. **Cascade deletes:** User deletion cascades to sessions, accounts, boards, and share links via foreign key constraints.
12. **GDPR compliance:** Data export (`exportMyData`) and account deletion features are implemented.
13. **tRPC middleware layering:** Clear separation between `publicProcedure`, `protectedProcedure`, and `adminProcedure` with proper auth checks at each level.

---

## Remediation Priority

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| 1 | C-1: Unauthenticated thumbnail access | Low | Immediate data leak |
| 2 | C-2: Share link board ID exposure + missing write-back | Medium | Data leak + broken feature |
| 3 | H-1: XSS in markdown renderer | Medium | Stored XSS for all visitors |
| 4 | H-2: Avatar content validation | Low | Content injection |
| 5 | H-3: Scene import validation | Low | Arbitrary R2 storage |
| 6 | H-4: Frontend admin role guards | Low | Defense-in-depth |
| 7 | M-2: Content-Security-Policy header | Medium | XSS mitigation |
| 8 | M-5: Owner deletion prevention | Low | Instance lockout |
| 9 | M-6: CSRF on GET auth endpoints | Low | State-change via navigation |
| 10 | M-7: Share link use count exhaustion | Low | Share link DoS |
| 11 | M-1: Persistent rate limiting | High | Brute-force protection |
| 12 | M-3: Email verification | Medium | Impersonation risk |
| 13 | M-4: Password strength | Low | Weak passwords |
| 14 | L-1 through L-5 | Low | Hardening |

---

## Files Reviewed

### Backend
- `apps/api/src/index.ts` -- Hono app, CORS, rate limiting, security headers
- `packages/api/src/index.ts` -- tRPC init, procedure middleware (public/protected/admin)
- `packages/api/src/context.ts` -- Session extraction from request headers
- `packages/api/src/routers/boards.ts` -- Board CRUD, drawing save/load, share links, thumbnails, library, import
- `packages/api/src/routers/collections.ts` -- Collection CRUD, board assignment
- `packages/api/src/routers/settings.ts` -- Registration, account deletion, data export, avatar, legal pages, username
- `packages/api/src/routers/index.ts` -- Router composition
- `packages/auth/src/index.ts` -- Better Auth config, cookie settings, 2FA, database hooks
- `packages/db/src/schema/auth.ts` -- User, session, account, twoFactor, appSettings, verification tables
- `packages/db/src/schema/boards.ts` -- Board, collection, shareLink tables
- `packages/shared/src/schemas/board.ts` -- Zod validation schemas
- `packages/shared/src/constants.ts` -- Limits and enums
- `packages/shared/src/index.ts` -- Package exports
- `packages/env/src/server.ts` -- Cloudflare env bindings
- `packages/env/env.d.ts` -- Type declarations for Cloudflare bindings

### Frontend
- `apps/web/src/lib/auth-client.ts` -- Better Auth React client
- `apps/web/src/lib/trpc.ts` -- tRPC client with credentials
- `apps/web/src/components/markdown-renderer.tsx` -- Custom markdown to HTML
- `apps/web/src/components/auth-guard.tsx` -- Session-based route protection
- `apps/web/src/components/setup-guard.tsx` -- First-run setup redirect
- `apps/web/src/components/error-boundary.tsx` -- Error boundary
- `apps/web/src/pages/login.tsx` -- Sign in/sign up with 2FA flow
- `apps/web/src/pages/setup.tsx` -- First-user admin account creation
- `apps/web/src/pages/dashboard.tsx` -- Board listing and management
- `apps/web/src/pages/editor.tsx` -- Excalidraw editor with auto-save
- `apps/web/src/pages/shared-board.tsx` -- Public share link viewer
- `apps/web/src/pages/trash.tsx` -- Soft-deleted board management
- `apps/web/src/pages/settings/index.tsx` -- Admin settings (registration toggle)
- `apps/web/src/pages/settings/profile.tsx` -- Profile, avatar, username, account deletion
- `apps/web/src/pages/settings/members.tsx` -- Member listing
- `apps/web/src/pages/settings/legal.tsx` -- Legal page editor
- `apps/web/src/pages/settings/collections.tsx` -- Collections management
- `apps/web/src/pages/legal/terms.tsx` -- Terms of Service display
- `apps/web/src/pages/legal/privacy.tsx` -- Privacy Policy display
