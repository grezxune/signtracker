import { importPKCS8, SignJWT } from "jose";

const DEFAULT_ISSUER = "https://signtracker.local";
const DEFAULT_AUDIENCE = "signtracker";
const DEFAULT_KID = "signtracker-main";

type TokenUser = {
  email: string;
  id?: string | null;
  name?: string | null;
  image?: string | null;
};

function parsePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"')) {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      return parsed.replace(/\\n/g, "\n");
    }
  }
  return trimmed.replace(/\\n/g, "\n");
}

function getPrivateKeyPem() {
  const raw = process.env.CONVEX_JWT_PRIVATE_KEY;
  if (!raw) {
    throw new Error("Missing CONVEX_JWT_PRIVATE_KEY");
  }
  return parsePrivateKey(raw);
}

function getIssuer() {
  return process.env.NEXT_PUBLIC_CONVEX_JWT_ISSUER ?? DEFAULT_ISSUER;
}

function getAudience() {
  return process.env.NEXT_PUBLIC_CONVEX_JWT_AUDIENCE ?? DEFAULT_AUDIENCE;
}

function getKid() {
  return process.env.CONVEX_JWT_KID ?? DEFAULT_KID;
}

/**
 * Issues a short-lived RS256 JWT that Convex accepts for authenticated requests.
 */
export async function issueConvexToken(user: TokenUser) {
  const privateKey = await importPKCS8(getPrivateKeyPem(), "RS256");
  const subject = user.id?.trim() || user.email.toLowerCase();

  return await new SignJWT({
    email: user.email.toLowerCase(),
    name: user.name ?? undefined,
    picture: user.image ?? undefined,
  })
    .setProtectedHeader({ alg: "RS256", kid: getKid(), typ: "JWT" })
    .setIssuer(getIssuer())
    .setAudience(getAudience())
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}
