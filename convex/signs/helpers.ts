import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

export type Confidence = "learning" | "familiar" | "mastered";

export async function ensureChildAccess(ctx: ReadCtx, userId: Id<"users">, childId: Id<"children">) {
  const access = await ctx.db
    .query("childAccess")
    .withIndex("by_user_child", (q) => q.eq("userId", userId).eq("childId", childId))
    .first();

  if (!access) throw new Error("Access denied");
  return access;
}

export async function getKnownSignForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  knownSignId: Id<"knownSigns">,
): Promise<Doc<"knownSigns">> {
  const knownSign = await ctx.db.get(knownSignId);
  if (!knownSign) throw new Error("Sign not found");

  await ensureChildAccess(ctx, userId, knownSign.childId);
  return knownSign;
}

export function getLifeprintUrl(word: string) {
  const firstLetter = word.charAt(0).toLowerCase();
  const slug = word.toLowerCase().replace(/\s+/g, "-");
  return `https://www.lifeprint.com/asl101/pages-signs/${firstLetter}/${slug}.htm`;
}
