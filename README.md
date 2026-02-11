# SignTracker

Track a child’s ASL learning journey with shared family access.

## Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- Convex (database + actions + realtime)
- NextAuth v5 (Google OAuth)
- Bun (package manager + scripts)

## Implemented Features

- Authenticated dashboard with child profiles
- Child detail view with sign confidence tracking (`learning`, `familiar`, `mastered`)
- Per-sign alias support and favorites
- Shared dictionary with category/search filtering
- Quick-add dictionary entries and add-to-child flow
- Family sharing by email invite
- Super-user dictionary edit/delete controls
- Lifeprint media fetch and cache (GIF/video/image)

## Security Model

- NextAuth authenticates users.
- `/api/convex/token` issues short-lived RS256 JWTs for Convex.
- Convex validates JWTs via `convex/auth.config.ts` and `convex/jwks.ts`.
- Convex mutations/queries authorize via `ctx.auth` identity, not client-supplied email.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Copy env template:
```bash
cp .env.example .env.local
```

3. Generate Convex JWT keys (writes `convex/jwks.ts` + `convex/jwks.json` and updates `.env.local`):
```bash
node scripts/generate-convex-auth-keys.mjs
```

4. Start Convex dev:
```bash
bunx convex dev
```

5. Start Next.js:
```bash
bun run dev
```

## Scripts

- `bun run dev`
- `bun run lint`
- `bun run test`
- `bun run build`

## Testing

- Unit tests: `src/lib/*.test.ts`
- Integration tests: `tests/integration/`
- E2E placeholder: `tests/e2e/`
