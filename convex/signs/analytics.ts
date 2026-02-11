import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUser } from "../lib/auth";
import { ensureChildAccess, getLifeprintUrl } from "./helpers";

export const listByCategory = query({
  args: { childId: v.id("children") },
  handler: async (ctx, { childId }) => {
    const user = await getAuthUser(ctx);
    if (!user) return { favorites: [], categories: {}, allCategories: [] };

    const access = await ensureChildAccess(ctx, user._id, childId).catch(() => null);
    if (!access) return { favorites: [], categories: {}, allCategories: [] };

    const signs = await ctx.db
      .query("knownSigns")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();

    const signDetails = await Promise.all(
      signs.map(async (sign) => {
        const dictionarySign = await ctx.db
          .query("savedSigns")
          .withIndex("by_sign_id", (q) => q.eq("signId", sign.signId))
          .first();

        return {
          ...sign,
          lifeprintUrl: dictionarySign?.lifeprintUrl || getLifeprintUrl(sign.signId),
          gifUrl: dictionarySign?.gifUrl,
          videoUrl: dictionarySign?.videoUrl,
          imageUrl: dictionarySign?.imageUrl,
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

    for (const [category, categorySigns] of Object.entries(categories)) {
      categories[category] = categorySigns.sort((a, b) =>
        (a.alias || a.signName).localeCompare(b.alias || b.signName),
      );
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

    const access = await ensureChildAccess(ctx, user._id, childId).catch(() => null);
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
