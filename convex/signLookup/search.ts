import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { formatSignName, getLifeprintUrl, guessCategory, matchesSignSearch, normalizeSignId } from "./helpers";
import type { SignResult } from "./types";

function buildLifeprintEntry(query: string): SignResult[] {
  const formattedName = formatSignName(query);
  return [
    {
      signId: normalizeSignId(query),
      name: formattedName,
      description: `Learn the ASL sign for "${formattedName}" on Lifeprint.com`,
      lifeprintUrl: getLifeprintUrl(query),
      category: guessCategory(query),
    },
  ];
}

export const search = internalAction({
  args: { query: v.string() },
  handler: async (ctx, { query }): Promise<{ results: SignResult[]; source: string }> => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return { results: [] as SignResult[], source: "none" };
    }

    const cached = await ctx.runQuery(internal.signLookup.getCachedSigns, {
      query: normalizedQuery,
    });
    if (cached.length > 0) {
      return { results: cached, source: "cache" };
    }

    const results = buildLifeprintEntry(normalizedQuery);
    for (const sign of results) {
      await ctx.runMutation(internal.signLookup.cacheSign, { sign });
    }

    return { results, source: "lifeprint" };
  },
});

export const getCachedSigns = internalQuery({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const normalizedSignId = normalizeSignId(query);

    let exactMatch = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", query.toLowerCase()))
      .first();

    if (!exactMatch && normalizedSignId !== query.toLowerCase()) {
      exactMatch = await ctx.db
        .query("savedSigns")
        .withIndex("by_sign_id", (q) => q.eq("signId", normalizedSignId))
        .first();
    }

    if (exactMatch) {
      return [
        {
          signId: exactMatch.signId,
          name: exactMatch.name,
          description: exactMatch.description,
          lifeprintUrl: exactMatch.lifeprintUrl,
          gifUrl: exactMatch.gifUrl,
          imageUrl: exactMatch.imageUrl,
          category: exactMatch.category,
        },
      ];
    }

    const allSigns = await ctx.db.query("savedSigns").collect();
    const matches = allSigns.filter((sign) => matchesSignSearch(sign.name, sign.signId, query));

    return matches.slice(0, 10).map((sign) => ({
      signId: sign.signId,
      name: sign.name,
      description: sign.description,
      lifeprintUrl: sign.lifeprintUrl,
      gifUrl: sign.gifUrl,
      imageUrl: sign.imageUrl,
      category: sign.category,
    }));
  },
});

export const cacheSign = internalMutation({
  args: {
    sign: v.object({
      signId: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      lifeprintUrl: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      category: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { sign }) => {
    const existing = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", sign.signId))
      .first();

    if (!existing) {
      return await ctx.db.insert("savedSigns", sign);
    }

    if (sign.lifeprintUrl && !existing.lifeprintUrl) {
      await ctx.db.patch(existing._id, { lifeprintUrl: sign.lifeprintUrl });
    }
    return existing._id;
  },
});

export const searchSigns = action({
  args: { query: v.string() },
  handler: async (ctx, { query }): Promise<{ results: SignResult[]; source: string }> => {
    return await ctx.runAction(internal.signLookup.search, { query });
  },
});
