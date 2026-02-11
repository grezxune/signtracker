---
title: Auth and Security Hardening
created: 2026-02-11
status: shipped
owner: Tommy
log:
  - 2026-02-11: Initial requirements documented
  - 2026-02-11: Implemented NextAuth-to-Convex JWT bridge and removed email-arg authorization
  - 2026-02-11: Added baseline unit and integration tests
  - 2026-02-11: Added middleware route protection, CI quality/e2e workflows, and sharing management controls
  - 2026-02-11: Added audit events, security alerts, and observability endpoints
  - 2026-02-11: Added dictionary governance workflow (seed + suggestion review)
  - 2026-02-11: Refactored oversized files into modular feature/domain folders with passing lint/test/build/e2e
---

## Problem
Authorization logic relied on client-provided email fields in Convex function args, which can be spoofed.

## Business Context
SignTracker handles child learning data and family-sharing workflows. Access control must be strict and auditable.

## Goals & KPIs
- Eliminate client-trusted identity in backend auth paths.
- Require authenticated identity checks for all sensitive read/write operations.
- Achieve passing `lint`, `build`, `test`, and core `e2e` gates.

## Personas/Journeys
- Parent owner: creates child, tracks signs, shares access.
- Shared family member: views and contributes signs only on shared children.
- Super user: curates dictionary entries and role assignments.

## Functional Requirements
- NextAuth session remains source of web identity.
- NextAuth-authenticated users receive short-lived Convex JWTs.
- Convex validates JWT and performs authz via `ctx.auth` identity.
- Child and sign mutations validate ownership/access server-side.
- Super-user mutations validate role server-side.
- Protected routes redirect unauthenticated users to sign-in.
- Repeated denied attempts are auditable and generate actionable alerts.
- Dictionary changes support governance (seed, user suggestions, super-user review).

## Non-functional Requirements
- No `any` in application code paths.
- No browser-native confirmation prompts for destructive actions.
- Build and lint must remain green (errors).

## Data & Integrations
- NextAuth Google provider.
- Convex auth config using custom JWT provider and JWKS.
- Resend remains optional for invite email delivery.

## Open Questions
- Should shared users be allowed to update child profile metadata or read-only?
- Should dictionary read endpoints require auth or remain public?

## Risks & Mitigations
- Risk: JWT key mismatch between Next app and Convex auth config.
  - Mitigation: key generation script writes both env private key and JWKS files.
- Risk: stale user rows after auth migration.
  - Mitigation: automatic `users.syncCurrent` bootstrap on authenticated app load.

## Success Metrics
- No email-based auth args remain in public Convex function contracts.
- Authenticated flows continue working end-to-end.
- Automated checks pass in CI/local.
- Core Playwright E2E flow passes locally.

## Rollout Plan
1. Deploy Convex auth config + functions.
2. Deploy Next.js token route + provider changes.
3. Validate sign-in, child CRUD, sign CRUD, sharing, dictionary admin flows.
4. Enable CI quality + scheduled E2E checks.
5. Monitor audit events/security alerts and invite email queue errors.

## Next Steps
- Expand E2E coverage to include dictionary governance approval/rejection paths.
- Add admin UI views for `observability` endpoints (alerts + audit drill-down).
