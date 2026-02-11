# Changelog

## 2026-02-11

### Added
- NextAuth-to-Convex JWT bridge via `/api/convex/token` and RS256 signing.
- Convex custom JWT auth config in `convex/auth.config.ts`.
- Auth utilities in `convex/lib/auth.ts`.
- Key generation script: `scripts/generate-convex-auth-keys.mjs`.
- `.env.example` with secure setup variables.
- Unit tests for dictionary data and integration test for JWT issuance.
- `UxStyle.md`, local `AGENTS.md`, and PRD `prds/security-hardening.md`.

### Changed
- Removed client-supplied email authorization pattern from child/sign/dictionary mutations and queries.
- Refactored frontend calls to use secure Convex auth-backed APIs.
- Updated sign-in flow to Google-only NextAuth path and added `/auth/error` page.
- Updated README for Bun + secure auth setup.
- Updated global styles for light/dark tokenization without `!important` rules.

### Security
- Backend authorization now resolves identity from `ctx.auth` and enforces server-side ownership/super-user checks.
- Email queue admin endpoints now require super-user access.
