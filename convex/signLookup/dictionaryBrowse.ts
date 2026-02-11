import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUserByIdentity } from "./auth";
import { matchesSignSearch, normalizeSignId } from "./helpers";

type DictionarySign = {
  _id: string;
  signId: string;
  name: string;
  category?: string;
  description?: string;
  lifeprintUrl?: string;
};

function applyDictionaryFilters(signs: DictionarySign[], category?: string, search?: string) {
  let filtered = signs;

  if (category && category !== "all") {
    filtered = filtered.filter((sign) => sign.category === category);
  }

  if (search && search.trim()) {
    filtered = filtered.filter((sign) => matchesSignSearch(sign.name, sign.signId, search));
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

export const browseDictionary = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    childId: v.optional(v.id("children")),
  },
  handler: async (ctx, { category, search, limit = 50, childId }) => {
    const allSigns = await ctx.db.query("savedSigns").collect();
    const signs = applyDictionaryFilters(allSigns, category, search).slice(0, limit);

    if (!childId) {
      return signs.map((sign) => ({ ...sign, isKnown: false }));
    }

    const user = await getAuthUserByIdentity(ctx);
    if (!user) throw new Error("Unauthorized");

    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();
    if (!access) throw new Error("Access denied");

    const knownSigns = await ctx.db
      .query("knownSigns")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();

    const knownSignIds = new Set(knownSigns.map((sign) => normalizeSignId(sign.signId)));

    return signs.map((sign) => ({
      ...sign,
      isKnown: knownSignIds.has(normalizeSignId(sign.signId)),
    }));
  },
});

export const browseDictionaryGlobal = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { category, search, limit = 50 }) => {
    const allSigns = await ctx.db.query("savedSigns").collect();
    return applyDictionaryFilters(allSigns, category, search).slice(0, limit);
  },
});

export const getDictionaryStats = query({
  args: {},
  handler: async (ctx) => {
    const signs = await ctx.db.query("savedSigns").collect();
    const byCategory: Record<string, number> = {};

    for (const sign of signs) {
      const category = sign.category || "General";
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    return {
      total: signs.length,
      byCategory,
    };
  },
});
