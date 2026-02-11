import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUser, requireAuth } from "./lib/auth";

type ReadCtx = QueryCtx | MutationCtx;
type Confidence = "learning" | "familiar" | "mastered";

async function ensureChildAccess(ctx: ReadCtx, userId: Id<"users">, childId: Id<"children">) {
  const access = await ctx.db
    .query("childAccess")
    .withIndex("by_user_child", (q) => q.eq("userId", userId).eq("childId", childId))
    .first();

  if (!access) {
    throw new Error("Access denied");
  }

  return access;
}

async function getKnownSignForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  knownSignId: Id<"knownSigns">,
): Promise<Doc<"knownSigns">> {
  const knownSign = await ctx.db.get(knownSignId);
  if (!knownSign) {
    throw new Error("Sign not found");
  }

  await ensureChildAccess(ctx, userId, knownSign.childId);
  return knownSign;
}

export const listKnown = query({
  args: { childId: v.id("children") },
  handler: async (ctx, { childId }) => {
    const user = await getAuthUser(ctx);
    if (!user) return [];

    try {
      await ensureChildAccess(ctx, user._id, childId);
    } catch {
      return [];
    }

    const signs = await ctx.db
      .query("knownSigns")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();

    return signs.sort((a, b) => b.learnedAt - a.learnedAt);
  },
});

export const addKnown = mutation({
  args: {
    childId: v.id("children"),
    signId: v.string(),
    signName: v.string(),
    signCategory: v.optional(v.string()),
    notes: v.optional(v.string()),
    confidence: v.optional(v.union(v.literal("learning"), v.literal("familiar"), v.literal("mastered"))),
  },
  handler: async (ctx, { childId, signId: rawSignId, signName, signCategory, notes, confidence }) => {
    const user = await requireAuth(ctx);
    await ensureChildAccess(ctx, user._id, childId);

    const normalizedSignId = rawSignId.trim().toLowerCase();

    const existingNormalized = await ctx.db
      .query("knownSigns")
      .withIndex("by_child_sign", (q) => q.eq("childId", childId).eq("signId", normalizedSignId))
      .first();

    const existingRaw =
      normalizedSignId !== rawSignId
        ? await ctx.db
            .query("knownSigns")
            .withIndex("by_child_sign", (q) => q.eq("childId", childId).eq("signId", rawSignId))
            .first()
        : null;

    if (existingNormalized || existingRaw) {
      throw new Error("Sign already in known list");
    }

    return await ctx.db.insert("knownSigns", {
      childId,
      signId: normalizedSignId,
      signName: signName.trim(),
      signCategory,
      learnedAt: Date.now(),
      notes,
      confidence: confidence ?? "learning",
      addedBy: user._id,
      favorite: false,
    });
  },
});

export const updateKnown = mutation({
  args: {
    knownSignId: v.id("knownSigns"),
    notes: v.optional(v.string()),
    confidence: v.optional(v.union(v.literal("learning"), v.literal("familiar"), v.literal("mastered"))),
  },
  handler: async (ctx, { knownSignId, notes, confidence }) => {
    const user = await requireAuth(ctx);
    await getKnownSignForUser(ctx, user._id, knownSignId);

    const updates: { notes?: string; confidence?: Confidence } = {};
    if (notes !== undefined) updates.notes = notes;
    if (confidence !== undefined) updates.confidence = confidence;

    await ctx.db.patch(knownSignId, updates);
  },
});

export const removeKnown = mutation({
  args: { knownSignId: v.id("knownSigns") },
  handler: async (ctx, { knownSignId }) => {
    const user = await requireAuth(ctx);
    await getKnownSignForUser(ctx, user._id, knownSignId);
    await ctx.db.delete(knownSignId);
  },
});

export const isKnown = query({
  args: {
    childId: v.id("children"),
    signId: v.string(),
  },
  handler: async (ctx, { childId, signId }) => {
    const user = await getAuthUser(ctx);
    if (!user) return false;

    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();

    if (!access) return false;

    const normalizedSignId = signId.trim().toLowerCase();
    const existing = await ctx.db
      .query("knownSigns")
      .withIndex("by_child_sign", (q) => q.eq("childId", childId).eq("signId", normalizedSignId))
      .first();

    return !!existing;
  },
});

export const updateSignName = mutation({
  args: {
    knownSignId: v.id("knownSigns"),
    signName: v.string(),
  },
  handler: async (ctx, { knownSignId, signName }) => {
    const user = await requireAuth(ctx);
    await getKnownSignForUser(ctx, user._id, knownSignId);

    const trimmed = signName.trim();
    if (!trimmed) {
      throw new Error("Sign name cannot be empty");
    }

    await ctx.db.patch(knownSignId, { signName: trimmed });
    return { success: true };
  },
});

export const updateAlias = mutation({
  args: {
    knownSignId: v.id("knownSigns"),
    alias: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { knownSignId, alias }) => {
    const user = await requireAuth(ctx);
    await getKnownSignForUser(ctx, user._id, knownSignId);

    const normalizedAlias = alias === null || alias.trim() === "" ? undefined : alias.trim();
    await ctx.db.patch(knownSignId, { alias: normalizedAlias });

    return { success: true };
  },
});

export const toggleFavorite = mutation({
  args: { knownSignId: v.id("knownSigns") },
  handler: async (ctx, { knownSignId }) => {
    const user = await requireAuth(ctx);
    const knownSign = await getKnownSignForUser(ctx, user._id, knownSignId);

    const favorite = !knownSign.favorite;
    await ctx.db.patch(knownSignId, { favorite });
    return favorite;
  },
});

function getLifeprintUrl(word: string): string {
  const firstLetter = word.charAt(0).toLowerCase();
  const slug = word.toLowerCase().replace(/\s+/g, "-");
  return `https://www.lifeprint.com/asl101/pages-signs/${firstLetter}/${slug}.htm`;
}

export const listByCategory = query({
  args: { childId: v.id("children") },
  handler: async (ctx, { childId }) => {
    const user = await getAuthUser(ctx);
    if (!user) return { favorites: [], categories: {}, allCategories: [] };

    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();

    if (!access) return { favorites: [], categories: {}, allCategories: [] };

    const signs = await ctx.db
      .query("knownSigns")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();

    const signDetails = await Promise.all(
      signs.map(async (sign) => {
        const details = await ctx.db
          .query("savedSigns")
          .withIndex("by_sign_id", (q) => q.eq("signId", sign.signId))
          .first();

        return {
          ...sign,
          lifeprintUrl: details?.lifeprintUrl || getLifeprintUrl(sign.signName),
          gifUrl: details?.gifUrl,
          videoUrl: details?.videoUrl,
          imageUrl: details?.imageUrl,
        };
      }),
    );

    const favorites = signDetails.filter((sign) => sign.favorite);

    const categories: Record<string, typeof signDetails> = {};
    for (const sign of signDetails) {
      const category = sign.signCategory || "General";
      if (!categories[category]) categories[category] = [];
      categories[category].push(sign);
    }

    for (const category of Object.keys(categories)) {
      categories[category].sort((a, b) => (a.alias || a.signName).localeCompare(b.alias || b.signName));
    }

    favorites.sort((a, b) => (a.alias || a.signName).localeCompare(b.alias || b.signName));

    return {
      favorites,
      categories,
      allCategories: Object.keys(categories).sort(),
    };
  },
});

export const getStats = query({
  args: { childId: v.id("children") },
  handler: async (ctx, { childId }) => {
    const user = await getAuthUser(ctx);
    if (!user) return null;

    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();

    if (!access) return null;

    const signs = await ctx.db
      .query("knownSigns")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();

    const byConfidence = {
      learning: signs.filter((sign) => sign.confidence === "learning").length,
      familiar: signs.filter((sign) => sign.confidence === "familiar").length,
      mastered: signs.filter((sign) => sign.confidence === "mastered").length,
    };

    const byCategory: Record<string, number> = {};
    for (const sign of signs) {
      const category = sign.signCategory || "Uncategorized";
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = signs.filter((sign) => sign.learnedAt > weekAgo).length;

    return {
      total: signs.length,
      byConfidence,
      byCategory,
      recentCount,
    };
  },
});
