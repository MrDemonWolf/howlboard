# HowlBoard GDPR Compliance Audit

**Date:** 2026-04-03
**Regulation:** EU General Data Protection Regulation (GDPR)

## Data Inventory

| Data Category | Storage | Retention | Legal Basis |
|---|---|---|---|
| User email, name | Cloudflare D1 (`user` table) | Until account deletion | Consent (registration) |
| Password hash | D1 (`account` table) | Until account deletion | Contract performance |
| Session tokens | D1 (`session` table) | Until expiry/logout | Legitimate interest |
| Board metadata | D1 (`board` table) | Until board deletion | Contract performance |
| Drawing data (scenes) | Cloudflare R2 | Until board deletion | Contract performance |
| 2FA secrets | D1 (`twoFactor` table) | Until disabled/account deletion | Consent |

## Article-by-Article Assessment

### Art. 5 -- Principles (Data Minimization)
- **Status:** PARTIAL COMPLIANCE
- Only essential fields collected (email, name, password hash)
- No unnecessary tracking or analytics data stored
- **Gap:** No data retention policy enforced automatically. Stale sessions and deleted-user data may linger.

### Art. 6 -- Lawful Basis
- **Status:** COMPLIANT
- Registration constitutes consent; service delivery is contractual basis

### Art. 12-14 -- Transparency / Privacy Notice
- **Status:** PARTIAL COMPLIANCE
- Frontend has `/legal/privacy` and `/legal/terms` routes
- **Gap:** Login and setup pages should link to these pages (frontend change -- out of scope for backend fixes)

### Art. 15 -- Right of Access
- **Status:** GAP
- No data export endpoint exists
- **Recommendation:** Add a `user.exportData` tRPC procedure that returns all user data as JSON

### Art. 17 -- Right to Erasure
- **Status:** GAP
- No account deletion endpoint exists
- Board deletion exists but user account deletion does not cascade through all tables
- **Recommendation:** Add `user.deleteAccount` procedure with cascade through boards, collections, share links, sessions, 2FA

### Art. 25 -- Data Protection by Design
- **Status:** COMPLIANT (after fixes)
- Passwords hashed by Better Auth (bcrypt)
- Cookies: `httpOnly`, `secure` (production), `sameSite: lax`, `path: /`
- HTTPS enforced via HSTS header
- Input validation on all mutations via Zod schemas
- Scene size limit enforced (10MB max)

### Art. 32 -- Security of Processing
- **Status:** IMPROVED (after fixes)
- Rate limiting added to prevent brute-force attacks
- Security headers prevent clickjacking and XSS
- Authorization checks on all protected procedures
- **Remaining gap:** No audit logging for access tracking

### Art. 33-34 -- Breach Notification
- **Status:** GAP
- No breach detection or notification mechanism
- **Recommendation:** Implement logging and alerting infrastructure

## Remediation Summary

| # | Issue | Priority | Status |
|---|---|---|---|
| 1 | Rate limiting on auth endpoints | HIGH | FIXED |
| 2 | Security headers (XFO, XSS, Referrer, Permissions) | MEDIUM | FIXED |
| 3 | Cookie path attribute | LOW | FIXED |
| 4 | Scene size input validation | MEDIUM | FIXED |
| 5 | Data export endpoint (Art. 15) | HIGH | TODO |
| 6 | Account deletion endpoint (Art. 17) | HIGH | TODO |
| 7 | Audit logging | MEDIUM | TODO |
| 8 | Breach notification process | MEDIUM | TODO |
| 9 | Automated data retention cleanup | LOW | TODO |
