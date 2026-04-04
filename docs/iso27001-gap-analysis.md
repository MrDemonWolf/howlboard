# HowlBoard ISO 27001 Gap Analysis

**Date:** 2026-04-03
**Standard:** ISO/IEC 27001:2022 -- Annex A Controls

## Scope

Backend API security controls for HowlBoard, a self-hosted collaborative whiteboard application deployed on Cloudflare Workers/D1/R2.

## Control Assessment

### A.5 -- Organizational Controls

| Control | Description | Status | Notes |
|---|---|---|---|
| A.5.1 | Information security policies | GAP | No formal security policy document |
| A.5.2 | Information security roles | PARTIAL | Admin role exists; no separation of duties |
| A.5.3 | Segregation of duties | GAP | Single admin role covers all operations |

### A.8 -- Technological Controls

| Control | Description | Status | Notes |
|---|---|---|---|
| A.8.1 | User endpoint devices | N/A | Self-hosted SPA, user-managed |
| A.8.2 | Privileged access rights | COMPLIANT | Admin role auto-assigned to first user only |
| A.8.3 | Information access restriction | COMPLIANT | Owner-based access control on boards/collections |
| A.8.4 | Access to source code | N/A | Repository-level control |
| A.8.5 | Secure authentication | IMPROVED | Better Auth with email/password + optional TOTP 2FA; rate limiting now enforced |
| A.8.6 | Capacity management | IMPROVED | Scene size validation (10MB) prevents storage abuse |
| A.8.7 | Protection against malware | PARTIAL | Input validation via Zod; no file scanning on R2 objects |
| A.8.8 | Technical vulnerability management | GAP | No dependency scanning or update policy |
| A.8.9 | Configuration management | PARTIAL | Typed env bindings; no infrastructure-as-code |
| A.8.10 | Information deletion | GAP | No automated retention; no account deletion endpoint |
| A.8.11 | Data masking | N/A | No PII displayed to other users |
| A.8.12 | Data leakage prevention | IMPROVED | Referrer-Policy, Permissions-Policy, X-Frame-Options headers added |
| A.8.13 | Information backup | PARTIAL | Cloudflare D1/R2 provide durability; no user-facing export |
| A.8.14 | Redundancy | COMPLIANT | Cloudflare global infrastructure |
| A.8.15 | Logging | GAP | Only Hono request logger; no security event logging |
| A.8.16 | Monitoring activities | GAP | No alerting or anomaly detection |
| A.8.17 | Clock synchronization | COMPLIANT | Cloudflare Workers use synchronized clocks |
| A.8.18 | Use of privileged utility programs | N/A | No system-level utilities |
| A.8.19 | Installation of software | N/A | Serverless deployment |
| A.8.20 | Networks security | COMPLIANT | Cloudflare edge network; CORS enforcement; HTTPS via HSTS |
| A.8.21 | Security of network services | COMPLIANT | Cloudflare DDoS protection at network level |
| A.8.22 | Segregation of networks | N/A | Serverless architecture |
| A.8.23 | Web filtering | N/A | Not applicable |
| A.8.24 | Use of cryptography | COMPLIANT | HTTPS, bcrypt password hashing, secure session tokens |
| A.8.25 | Secure development lifecycle | PARTIAL | TypeScript, Zod validation, tRPC type safety; no formal SDLC |
| A.8.26 | Application security requirements | IMPROVED | Rate limiting, security headers, input validation now enforced |
| A.8.27 | Secure system architecture | COMPLIANT | Separation of concerns (API/auth/DB packages), typed env |
| A.8.28 | Secure coding | COMPLIANT | Parameterized queries (Drizzle ORM), Zod input validation |

## Fixes Applied

1. **A.8.5 / A.8.26 -- Rate limiting:** Auth endpoints limited to 5 req/min/IP; API limited to 60 req/min/IP
2. **A.8.12 / A.8.26 -- Security headers:** X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
3. **A.8.5 -- Cookie security:** Added explicit `path: /` to session cookies
4. **A.8.6 / A.8.26 -- Input validation:** Scene size limit (10MB) enforced on `saveDrawing` mutation

## Priority Gaps Remaining

| Priority | Control | Gap | Recommendation |
|---|---|---|---|
| HIGH | A.8.10 | No account deletion | Implement `user.deleteAccount` with cascading deletes |
| HIGH | A.8.15 | No security logging | Add structured logging for auth events, failed access attempts |
| MEDIUM | A.8.8 | No vulnerability management | Add dependency scanning (e.g., `npm audit`, Snyk) to CI |
| MEDIUM | A.8.16 | No monitoring | Integrate with Cloudflare Analytics or external SIEM |
| LOW | A.5.1 | No formal security policy | Draft and publish information security policy |
| LOW | A.8.13 | No user data export | Implement data export for GDPR Art. 15 compliance |
