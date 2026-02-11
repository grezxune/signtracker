import { beforeAll, describe, expect, it } from "bun:test";
import { exportJWK, exportPKCS8, generateKeyPair, importJWK, jwtVerify } from "jose";
import { issueConvexToken } from "../../src/lib/convex-jwt";

const ISSUER = "https://signtracker.test";
const AUDIENCE = "signtracker-test";
const KID = "integration-key";

let verifyKey: CryptoKey;

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256", {
    modulusLength: 2048,
    extractable: true,
  });

  const privatePem = await exportPKCS8(privateKey);
  const publicJwk = await exportJWK(publicKey);

  process.env.CONVEX_JWT_PRIVATE_KEY = JSON.stringify(privatePem);
  process.env.NEXT_PUBLIC_CONVEX_JWT_ISSUER = ISSUER;
  process.env.NEXT_PUBLIC_CONVEX_JWT_AUDIENCE = AUDIENCE;
  process.env.CONVEX_JWT_KID = KID;

  verifyKey = await importJWK(
    {
      ...publicJwk,
      alg: "RS256",
      use: "sig",
      kid: KID,
    },
    "RS256",
  );
});

describe("issueConvexToken", () => {
  it("issues a token that validates against issuer and audience", async () => {
    const token = await issueConvexToken({
      email: "Parent@Example.com",
      id: "user_123",
      name: "Parent User",
      image: "https://example.com/avatar.png",
    });

    const { payload, protectedHeader } = await jwtVerify(token, verifyKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    expect(protectedHeader.alg).toBe("RS256");
    expect(protectedHeader.kid).toBe(KID);
    expect(payload.sub).toBe("user_123");
    expect(payload.email).toBe("parent@example.com");
    expect(payload.name).toBe("Parent User");
    expect(payload.picture).toBe("https://example.com/avatar.png");
  });
});
