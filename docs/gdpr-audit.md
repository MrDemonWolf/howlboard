# HowlBoard GDPR Compliance Audit

**Audit Date:** 2026-04-04
**Auditor:** Automated compliance review
**Scope:** Full codebase review of HowlBoard self-hosted collaborative whiteboard application
**Version:** Current main branch (commit 2a4918e)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Data Inventory](#2-data-inventory)
3. [Lawful Basis for Processing](#3-lawful-basis-for-processing)
4. [Data Subject Rights Assessment](#4-data-subject-rights-assessment)
5. [Data Retention Policies](#5-data-retention-policies)
6. [Cross-Border Transfers](#6-cross-border-transfers)
7. [Cookie Usage and Consent](#7-cookie-usage-and-consent)
8. [Privacy by Design Assessment](#8-privacy-by-design-assessment)
9. [Recommendations](#9-recommendations)

---

## 1. Executive Summary

HowlBoard is a self-hosted collaborative whiteboard application built on Excalidraw, deployed on Cloudflare Workers infrastructure (D1, R2, KV). As a self-hosted solution, GDPR compliance is a shared responsibility between the software and the instance operator (data controller).

**Overall Assessment:** Partial compliance. The application demonstrates good privacy-by-design foundations (minimal data collection, account deletion, data export) but has significant gaps in consent management, data retention automation, breach notification procedures, and Data Protection Impact Assessment (DPIA) documentation.

**Risk Level:** MEDIUM -- Several high-priority items require remediation before processing EU personal data at scale.

---

## 2. Data Inventory

### 2.1 Personal Data Collected

| Data Category | Fields | Storage Location | Table/Key | Sensitivity |
|---|---|---|---|---|
| **Identity Data** | `id`, `email`, `name`, `username`, `image` (avatar R2 key) | Cloudflare D1 | `user` | Standard |
| **Authentication Credentials** | `password` (hashed via Better Auth) | Cloudflare D1 | `account` | High |
| **Session Data** | `token`, `ipAddress`, `userAgent`, `expiresAt` | Cloudflare D1 | `session` | Standard |
| **OAuth/Account Linking** | `accountId`, `providerId`, `accessToken`, `refreshToken`, `idToken`, `scope` | Cloudflare D1 | `account` | High |
| **2FA Secrets** | `secret` (TOTP), `backupCodes` | Cloudflare D1 | `two_factor` | High |
| **Email Verification** | `identifier`, `value`, `expiresAt` | Cloudflare D1 | `verification` | Standard |
| **User Content** | Board scene JSON, thumbnails, library items | Cloudflare R2 | `scenes/{id}.json`, `libraries/{id}.json`, `avatars/{id}.png` | Standard |
| **Board Metadata** | `title`, `description`, `visibility`, `ownerId`, timestamps | Cloudflare D1 | `board` | Standard |
| **Share Links** | `token`, `permission`, `useCount`, `expiresAt`, `maxUses` | Cloudflare D1 | `share_link` | Standard |
| **Collections** | `name`, `color`, `ownerId` | Cloudflare D1 | `collection` | Low |
| **App Settings** | Instance configuration key-value pairs | Cloudflare D1 | `app_settings` | Low |

### 2.2 Data Not Collected

- No tracking cookies or analytics identifiers
- No behavioral profiling data
- No marketing or advertising data
- No geolocation data (beyond IP address in sessions)
- No financial or payment data

### 2.3 Special Category Data (Art. 9)

No special category data is intentionally collected. However, drawing content stored in R2 may incidentally contain special category data created by users (e.g., medical diagrams). The application has no content scanning or classification mechanisms.

---

## 3. Lawful Basis for Processing

| Processing Activity | Lawful Basis | GDPR Article | Notes |
|---|---|---|---|
| Account creation (email, name, password) | **Contract performance** (Art. 6(1)(b)) | Art. 6(1)(b) | Necessary to provide the service |
| Session management (IP, user agent) | **Legitimate interest** (Art. 6(1)(f)) | Art. 6(1)(f) | Security and fraud prevention |
| Board storage and retrieval | **Contract performance** (Art. 6(1)(b)) | Art. 6(1)(b) | Core service functionality |
| Share link generation | **Contract performance** (Art. 6(1)(b)) | Art. 6(1)(b) | User-initiated feature |
| 2FA secret storage | **Contract performance** (Art. 6(1)(b)) | Art. 6(1)(b) | User-enabled security feature |
| Avatar upload | **Consent** (Art. 6(1)(a)) | Art. 6(1)(a) | User-initiated, optional |
| IP address logging in sessions | **Legitimate interest** (Art. 6(1)(f)) | Art. 6(1)(f) | Security monitoring |

### 3.1 Gaps in Lawful Basis Documentation

- **FINDING:** No explicit consent collection mechanism exists at registration. The Terms of Service and Privacy Policy are available at `/legal/terms` and `/legal/privacy` but there is no evidence of a mandatory consent checkbox during signup.
- **FINDING:** No Legitimate Interest Assessment (LIA) is documented for IP address/user agent collection in sessions.
- **FINDING:** The privacy policy (default template in `packages/api/src/routers/settings.ts`) states data is "encrypted" in R2, but scene JSON is stored as plaintext -- this is a misrepresentation.

---

## 4. Data Subject Rights Assessment

### 4.1 Right of Access (Art. 15)

| Aspect | Status | Details |
|---|---|---|
| Implementation | **Implemented** | `exportMyData` procedure in `settings.ts` returns user profile and board metadata |
| UI Access | **Implemented** | Available in profile settings page |
| Response Format | **Partial** | Returns JSON via tRPC; does not include R2-stored content (scene files, avatars, library data) |
| Completeness | **Incomplete** | Missing: session history, share link data, collection data, actual drawing content, 2FA status |
| Response Time | **N/A** | Instant (API call), but no 30-day SLA tracking |

**Gap:** The `exportMyData` endpoint only exports `user` (id, email, name, role, createdAt) and `boards` (id, title, visibility, createdAt, lastEditedAt). It does NOT export:
- Actual drawing scene data from R2
- Session/login history (IP addresses, user agents)
- Share links created
- Collections
- Avatar image
- 2FA backup codes
- Account/OAuth token metadata

### 4.2 Right to Rectification (Art. 16)

| Aspect | Status | Details |
|---|---|---|
| Username | **Implemented** | `updateUsername` procedure with validation |
| Email | **Not Implemented** | Email is displayed as read-only in profile settings; no change mechanism |
| Name | **Not Implemented** | No procedure to update display name after registration |
| Avatar | **Implemented** | `uploadAvatar` procedure with old avatar cleanup |
| Board content | **Implemented** | Users can edit their boards freely |

**Gap:** Users cannot change their email address or display name after registration. This is a direct violation of Art. 16.

### 4.3 Right to Erasure (Art. 17)

| Aspect | Status | Details |
|---|---|---|
| Account deletion | **Implemented** | `deleteAccount` procedure in `settings.ts` |
| R2 content cleanup | **Implemented** | Deletes scene files and thumbnails for all user boards |
| DB cascade deletion | **Implemented** | Foreign key cascades delete sessions, accounts, boards, share links |
| UI access | **Implemented** | "Delete Account" button in profile settings with confirmation dialog |
| Library data cleanup | **Not Implemented** | `libraries/{userId}.json` in R2 is NOT deleted on account deletion |
| Avatar cleanup | **Not Implemented** | `avatars/{userId}.png` in R2 is NOT deleted on account deletion |
| Soft-deleted boards | **Partial** | Trashed boards (with `deletedAt` set) are included in R2 cleanup, but no automated permanent deletion schedule exists |

**Gap:** The `deleteAccount` procedure deletes board scenes and thumbnails but misses:
- Library data (`libraries/{userId}.json`)
- Avatar images (`avatars/{userId}.png`)
- Any R2 objects not directly referenced via `sceneKey`/`thumbnailKey`

### 4.4 Right to Data Portability (Art. 20)

| Aspect | Status | Details |
|---|---|---|
| Export format | **Partial** | `exportMyData` returns JSON; Excalidraw scenes can be exported as `.excalidraw` files from the editor |
| Machine-readable | **Partial** | JSON is machine-readable, but no standardized format |
| Direct transfer | **Not Implemented** | No mechanism to transfer data to another controller |
| Completeness | **Incomplete** | Same gaps as Right of Access -- R2 content not included in export |

### 4.5 Right to Restriction of Processing (Art. 18)

| Status | **Not Implemented** |
|---|---|
| Details | No mechanism to restrict processing while keeping data stored. No "freeze account" functionality. |

### 4.6 Right to Object (Art. 21)

| Status | **Partially Applicable** |
|---|---|
| Details | Since most processing is based on contract performance, the right to object is limited. However, for session IP logging (legitimate interest), no objection mechanism exists. |

---

## 5. Data Retention Policies

### 5.1 Current State

| Data Type | Retention Policy | Automated Deletion | Status |
|---|---|---|---|
| User accounts | Indefinite | No | **No policy defined** |
| Sessions | Until `expiresAt` timestamp | Managed by Better Auth | **Partial** -- expired sessions may not be actively pruned |
| Verification tokens | Until `expiresAt` timestamp | No automated cleanup | **Gap** |
| Soft-deleted boards | Indefinite (until manual permanent delete) | No | **Gap** |
| Share links | Until `expiresAt` (if set) or indefinite | No automated cleanup | **Gap** |
| R2 scene data | Indefinite | Only on board/account deletion | **No policy defined** |
| 2FA secrets/backup codes | Until user disables 2FA or deletes account | Cascade delete | **Acceptable** |
| IP addresses in sessions | Same as session lifetime | Same as sessions | **No explicit policy** |

### 5.2 Critical Gaps

1. **No data retention schedule** is defined or enforced for any data category.
2. **Expired sessions** are not automatically purged from D1.
3. **Expired verification tokens** accumulate indefinitely.
4. **Soft-deleted boards** (`deletedAt` is set) have no automatic permanent deletion (e.g., 30-day auto-purge).
5. **Expired share links** remain in the database after `expiresAt` passes.

---

## 6. Cross-Border Transfers

### 6.1 Infrastructure

HowlBoard is deployed on Cloudflare Workers, which operates a global edge network. Data may be processed in any Cloudflare data center worldwide.

| Component | Service | Data Residency |
|---|---|---|
| Application logic | Cloudflare Workers | Global edge (nearest PoP) |
| Relational data | Cloudflare D1 (SQLite) | Region configured by operator |
| Object storage | Cloudflare R2 | Region configured by operator |
| Caching | Cloudflare KV | Global replication |

### 6.2 Transfer Mechanisms

- Cloudflare is certified under the **EU-US Data Privacy Framework** and provides **Standard Contractual Clauses (SCCs)** for international transfers.
- Cloudflare's DPA covers sub-processor obligations.
- **However**, the self-hosted operator (data controller) is responsible for:
  - Ensuring their Cloudflare account has appropriate DPA in place
  - Configuring D1/R2 region placement for data residency requirements
  - Documenting transfer impact assessments (TIA)

### 6.3 Gaps

1. **No documentation** guides instance operators on configuring data residency.
2. **KV caching** (`CACHE` binding) replicates globally, which means any cached personal data could be stored outside the EEA. Currently, KV usage appears minimal but is architecturally available.
3. **No Transfer Impact Assessment (TIA)** template is provided for operators.

---

## 7. Cookie Usage and Consent

### 7.1 Cookies Used

| Cookie | Purpose | Type | Consent Required |
|---|---|---|---|
| Better Auth session cookie | Authentication session management | **Strictly necessary** | No (ePrivacy exemption) |

**Cookie Attributes (from `packages/auth/src/index.ts`):**
- `sameSite: "lax"` -- Prevents CSRF on cross-origin POST
- `secure: true` (when HTTPS) -- Encrypted in transit
- `httpOnly: true` -- Not accessible via JavaScript
- `path: "/"` -- Scoped to entire domain

### 7.2 Assessment

- **Positive:** Only essential session cookies are used. No analytics, tracking, or marketing cookies.
- **Positive:** Cookie attributes follow security best practices.
- **Gap:** No cookie banner or consent mechanism exists, but one is not strictly required since only strictly necessary cookies are used (ePrivacy Directive Art. 5(3) exemption).
- **Recommendation:** A minimal cookie notice informing users about the session cookie would improve transparency, even if consent is not legally required.

---

## 8. Privacy by Design Assessment (Art. 25)

### 8.1 Positive Findings

| Principle | Implementation | Rating |
|---|---|---|
| **Data minimization** | Only essential fields collected; no analytics/tracking | Good |
| **Purpose limitation** | Each data field has a clear purpose tied to functionality | Good |
| **Storage limitation** | Self-hosted model gives operators full control | Good |
| **Security by default** | HTTPS enforcement (HSTS), httpOnly cookies, CORS restrictions, security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy) | Good |
| **Access control** | Role-based (owner/member), `protectedProcedure` / `adminProcedure` authorization | Good |
| **Input validation** | Zod schemas enforce limits on all inputs (title 255 chars, description 1000 chars, scene 10MB) | Good |
| **2FA support** | TOTP two-factor authentication available | Good |
| **Default privacy** | Boards default to `private` visibility | Good |
| **Rate limiting** | In-memory per-isolate rate limiting on auth endpoints (10 req/min login, 5 req/min signup) | Partial |
| **Soft delete** | Boards use soft-delete with restore capability | Good |
| **Registration control** | Admin can disable open registration | Good |
| **Share link controls** | Expiration dates and max-use limits | Good |

### 8.2 Deficiencies

| Principle | Issue | Rating |
|---|---|---|
| **Encryption at rest** | TOTP secrets and backup codes stored as plaintext in D1; OAuth tokens (access/refresh/id) stored as plaintext | Poor |
| **Password policy** | No minimum password complexity requirements enforced (delegated to Better Auth defaults) | Partial |
| **Email verification** | Disabled (`requireEmailVerification: false` in auth config) | Poor |
| **Audit logging** | No audit trail for admin actions, data access, or account changes | Not Implemented |
| **Consent records** | No record of when/how consent was given | Not Implemented |
| **Privacy notices** | Default privacy policy template contains inaccurate claim about "encrypted JSON files" | Poor |
| **DPIA** | No Data Protection Impact Assessment has been conducted | Not Implemented |
| **Breach notification** | No breach detection or notification mechanism | Not Implemented |
| **DPO designation** | No Data Protection Officer role or contact defined | Not Implemented |

---

## 9. Recommendations

### Priority 1 -- Critical (Address within 30 days)

| # | Finding | Recommendation | GDPR Article |
|---|---|---|---|
| 1.1 | `exportMyData` does not include R2 content (scenes, avatars, libraries), sessions, share links, or collections | Extend `exportMyData` to include ALL personal data: scene JSON from R2, avatar, library data, session history, share links, collections, 2FA status | Art. 15, 20 |
| 1.2 | Account deletion misses `libraries/{userId}.json` and `avatars/{userId}.png` in R2 | Add R2 cleanup for library and avatar objects in `deleteAccount` procedure | Art. 17 |
| 1.3 | Users cannot change email or display name | Implement email change (with verification) and name update procedures | Art. 16 |
| 1.4 | TOTP secrets and backup codes stored as plaintext in D1 | Encrypt 2FA secrets at rest using `BETTER_AUTH_SECRET` as encryption key | Art. 32 |
| 1.5 | Default privacy policy claims drawings are "encrypted JSON files" but they are stored as plaintext | Correct the default privacy policy template to accurately describe storage | Art. 13, 14 |

### Priority 2 -- High (Address within 90 days)

| # | Finding | Recommendation | GDPR Article |
|---|---|---|---|
| 2.1 | No data retention schedule | Implement automated cleanup: purge expired sessions, expired verification tokens, expired share links; auto-delete soft-deleted boards after 30 days | Art. 5(1)(e) |
| 2.2 | No consent checkbox at registration | Add mandatory consent checkbox linking to privacy policy during signup | Art. 7 |
| 2.3 | No audit logging | Implement audit log for: account creation/deletion, admin actions, data exports, 2FA changes, login events | Art. 5(2), 30 |
| 2.4 | Email verification disabled | Enable `requireEmailVerification` to validate email ownership | Art. 5(1)(d) |
| 2.5 | No breach notification mechanism | Implement breach detection (anomalous access patterns) and notification workflow (72-hour window per Art. 33) | Art. 33, 34 |
| 2.6 | Rate limiting is per-isolate (in-memory) and easily bypassed | Migrate rate limiting to Cloudflare KV or Durable Objects for cross-instance enforcement | Art. 32 |

### Priority 3 -- Medium (Address within 180 days)

| # | Finding | Recommendation | GDPR Article |
|---|---|---|---|
| 3.1 | No DPIA conducted | Conduct and document a Data Protection Impact Assessment, especially for collaborative/shared board features | Art. 35 |
| 3.2 | No Transfer Impact Assessment for Cloudflare infrastructure | Provide operator documentation/template for TIA covering Cloudflare's global infrastructure | Art. 46 |
| 3.3 | No restriction of processing mechanism | Implement account freeze/suspension feature that stops processing while preserving data | Art. 18 |
| 3.4 | No DPO contact or designation guidance | Provide configuration option for DPO contact details displayed in privacy policy | Art. 37-39 |
| 3.5 | No cookie notice | Add a minimal informational cookie notice (not legally required for strictly necessary cookies but improves transparency) | Art. 13 |
| 3.6 | OAuth tokens stored as plaintext | Encrypt OAuth access/refresh/id tokens at rest | Art. 32 |
| 3.7 | No password complexity policy | Enforce minimum password requirements (length, complexity) | Art. 32 |

### Priority 4 -- Low (Address within 12 months)

| # | Finding | Recommendation | GDPR Article |
|---|---|---|---|
| 4.1 | No Records of Processing Activities (ROPA) template | Provide a ROPA template for instance operators | Art. 30 |
| 4.2 | No automated data subject request workflow | Build admin dashboard for managing DSARs with SLA tracking (30-day response) | Art. 12 |
| 4.3 | No consent withdrawal mechanism for avatar uploads | Add explicit consent withdrawal (delete avatar) separate from account deletion | Art. 7(3) |
| 4.4 | No data residency configuration guide | Document how operators should configure D1/R2 regions and KV caching for EEA data residency | Art. 44-49 |

---

## Appendix A: Data Flow Diagram

```
User Browser
    |
    +-- [HTTPS + HSTS] --> Cloudflare Edge (Worker)
    |                           |
    |                           +-- Hono middleware (CORS, security headers, rate limiting)
    |                           |
    |                           +-- /api/auth/* --> Better Auth (session cookies, httpOnly)
    |                           |       +-- D1: user, session, account, verification, two_factor
    |                           |
    |                           +-- /trpc/* --> tRPC Router
    |                           |       +-- protectedProcedure (requires session)
    |                           |       +-- adminProcedure (requires owner role)
    |                           |       +-- publicProcedure (no auth)
    |                           |
    |                           +-- D1 Database
    |                           |       +-- user, session, account, verification, two_factor,
    |                           |           board, collection, share_link, app_settings
    |                           |
    |                           +-- R2 Bucket (DRAWINGS_BUCKET)
    |                           |       +-- scenes/{id}.json, libraries/{id}.json, avatars/{id}.png
    |                           |
    |                           +-- KV (CACHE)
    |                                   +-- (currently minimal usage)
    |
    +-- Local Storage (browser)
            +-- Excalidraw local mode scene data
```

## Appendix B: Applicable GDPR Articles Reference

| Article | Topic | Relevance to HowlBoard |
|---|---|---|
| Art. 5 | Principles of processing | Data minimization (good), storage limitation (gap), accountability (gap) |
| Art. 6 | Lawful basis | Contract + legitimate interest (needs documentation) |
| Art. 7 | Consent conditions | No consent records maintained |
| Art. 12-14 | Transparency | Privacy policy exists but contains inaccuracies |
| Art. 15 | Right of access | Partially implemented |
| Art. 16 | Right to rectification | Partially implemented (email/name missing) |
| Art. 17 | Right to erasure | Mostly implemented (R2 gaps) |
| Art. 18 | Right to restriction | Not implemented |
| Art. 20 | Right to portability | Partially implemented |
| Art. 25 | Privacy by design | Good foundations, encryption gaps |
| Art. 30 | Records of processing | Not implemented |
| Art. 32 | Security of processing | Partial (good transport security, poor at-rest encryption) |
| Art. 33-34 | Breach notification | Not implemented |
| Art. 35 | DPIA | Not conducted |
| Art. 44-49 | International transfers | Cloudflare DPF/SCCs available but not documented |

---

*This audit is based on a static code review and does not include penetration testing, infrastructure configuration review, or operational procedure assessment. Instance operators should supplement this with their own security assessments.*
