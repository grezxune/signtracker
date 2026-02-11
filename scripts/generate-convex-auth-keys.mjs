#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateKeyPair, exportJWK, exportPKCS8 } from "jose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");
const jwksJsonPath = path.join(root, "convex", "jwks.json");
const jwksTsPath = path.join(root, "convex", "jwks.ts");

const ISSUER = process.env.NEXT_PUBLIC_CONVEX_JWT_ISSUER ?? "https://signtracker.local";
const AUDIENCE = process.env.NEXT_PUBLIC_CONVEX_JWT_AUDIENCE ?? "signtracker";
const KID = process.env.CONVEX_JWT_KID ?? "signtracker-main";

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  const trimmed = content.trimEnd();
  return `${trimmed}${trimmed ? "\n" : ""}${line}\n`;
}

async function main() {
  const { privateKey, publicKey } = await generateKeyPair("RS256", {
    modulusLength: 2048,
    extractable: true,
  });

  const publicJwk = await exportJWK(publicKey);
  publicJwk.use = "sig";
  publicJwk.alg = "RS256";
  publicJwk.kid = KID;

  const jwks = { keys: [publicJwk] };
  await fs.mkdir(path.dirname(jwksJsonPath), { recursive: true });
  await fs.writeFile(jwksJsonPath, `${JSON.stringify(jwks, null, 2)}\n`, "utf8");
  await fs.writeFile(
    jwksTsPath,
    `export const jwks = ${JSON.stringify(jwks, null, 2)} as const;\n`,
    "utf8",
  );

  const privatePem = await exportPKCS8(privateKey);
  const privateKeyForEnv = JSON.stringify(privatePem);

  let envContent = "";
  try {
    envContent = await fs.readFile(envPath, "utf8");
  } catch {
    envContent = "";
  }

  envContent = upsertEnv(envContent, "CONVEX_JWT_PRIVATE_KEY", privateKeyForEnv);
  envContent = upsertEnv(envContent, "CONVEX_JWT_KID", KID);
  envContent = upsertEnv(envContent, "NEXT_PUBLIC_CONVEX_JWT_ISSUER", ISSUER);
  envContent = upsertEnv(envContent, "NEXT_PUBLIC_CONVEX_JWT_AUDIENCE", AUDIENCE);

  await fs.writeFile(envPath, envContent, "utf8");

  process.stdout.write(
    [
      "Generated Convex auth keys:",
      `- Public JWKS: ${path.relative(root, jwksJsonPath)}`,
      `- TS export: ${path.relative(root, jwksTsPath)}`,
      `- Private key added/updated: ${path.relative(root, envPath)} (CONVEX_JWT_PRIVATE_KEY)`,
      `- Issuer: ${ISSUER}`,
      `- Audience: ${AUDIENCE}`,
      "",
      "Next steps:",
      "1) Deploy/update Convex so auth.config.ts picks up convex/jwks.json",
      "2) Restart Next.js dev server to load updated .env.local",
    ].join("\n") + "\n",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
