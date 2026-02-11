# SignTracker Local Agent Rules

## Scope
These local rules apply to this repository only.

## Implementation Priorities
1. Security and authorization correctness first.
2. Stable user flows second.
3. Visual polish and refactoring third.

## Auth + Data Access
- Use NextAuth for identity and session handling.
- Convex authorization must use authenticated identity (`ctx.auth`), not user-provided email arguments.
- For privileged operations (role management, dictionary destructive edits), enforce super-user checks server-side.

## Frontend
- Use App Router patterns only.
- Keep screens responsive and mobile-friendly.
- Use shared UI components for repeated patterns.
- Use branded confirmation modal for dangerous actions.

## Backend
- Keep Convex functions typed and validated.
- Avoid `any` in application code.
- Prefer reusable auth utilities in `convex/lib/auth.ts`.

## Quality Gates
- `bun run lint` must pass with zero errors.
- `bun run build` must pass.
- `bun run test` must pass.

## Docs
- Keep README, PRDs, and CHANGELOG up to date when behavior changes.
