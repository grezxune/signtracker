# Convex Backend

Core domains:
- `users.ts`: auth-synced user records and role management
- `children.ts`: child CRUD and family sharing
- `signs.ts`: known sign CRUD and progress stats
- `signLookup.ts`: dictionary search/add/admin/media scraping
- `emails.ts`: invite email queue processing

Auth:
- `auth.config.ts`: custom JWT provider for Convex
- `jwks.ts` / `jwks.json`: public keys used by Convex JWT verification
- `lib/auth.ts`: shared helpers (`getAuthUser`, `requireAuth`, etc.)

All sensitive operations must authorize from `ctx.auth` identity.
