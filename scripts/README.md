# Scripts

- `generate-convex-auth-keys.mjs`: generates RS256 key material for NextAuth->Convex JWT bridging.
  - Writes public JWKS files in `convex/`.
  - Upserts private signing key and related vars in `.env.local`.
