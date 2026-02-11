import type { AuthConfig } from "convex/server";
import { jwks } from "./jwks";

const CONVEX_JWT_ISSUER = "https://signtracker.local";
const CONVEX_JWT_AUDIENCE = "signtracker";

const jwksUrl = `data:application/json;charset=utf-8,${encodeURIComponent(
  JSON.stringify(jwks),
)}`;

export default {
  providers: [
    {
      type: "customJwt",
      issuer: CONVEX_JWT_ISSUER,
      algorithm: "RS256",
      jwks: jwksUrl,
      applicationID: CONVEX_JWT_AUDIENCE,
    },
  ],
} satisfies AuthConfig;
