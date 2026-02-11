import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { getAuthUserByIdentity } from "./auth";
import { normalizeSignId } from "./helpers";
import { PREDEFINED_CATEGORIES } from "./types";
import type { SignResult } from "./types";

export const getCurrentUserId = internalQuery({
  args: {},
  handler: async (ctx): Promise<Id<"users"> | null> => {
    const user = await getAuthUserByIdentity(ctx);
    return user?._id ?? null;
  },
});

export const ensureDictionaryEntry = internalMutation({
  args: {
    signId: v.string(),
    signName: v.string(),
    signCategory: v.optional(v.string()),
    lifeprintUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedSignId = normalizeSignId(args.signId);
    const existing = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", normalizedSignId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("savedSigns", {
      signId: normalizedSignId,
      name: args.signName,
      description: args.description,
      lifeprintUrl: args.lifeprintUrl,
      category: args.signCategory,
    });
  },
});

export const addKnownSign = internalMutation({
  args: {
    userId: v.id("users"),
    childId: v.id("children"),
    signId: v.string(),
    signName: v.string(),
    signCategory: v.optional(v.string()),
    notes: v.optional(v.string()),
    lifeprintUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const signId = normalizeSignId(args.signId);

    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", args.userId).eq("childId", args.childId))
      .first();
    if (!access) throw new Error("Access denied");

    const existing = await ctx.db
      .query("knownSigns")
      .withIndex("by_child_sign", (q) => q.eq("childId", args.childId).eq("signId", signId))
      .first();
    if (existing) throw new Error("Sign already in known list");

    const cachedSign = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();

    if (!cachedSign) {
      await ctx.db.insert("savedSigns", {
        signId,
        name: args.signName,
        description: args.description,
        lifeprintUrl: args.lifeprintUrl,
        category: args.signCategory,
      });
    }

    return await ctx.db.insert("knownSigns", {
      childId: args.childId,
      signId,
      signName: args.signName,
      signCategory: args.signCategory,
      learnedAt: Date.now(),
      notes: args.notes,
      confidence: "learning",
      addedBy: args.userId,
      favorite: false,
    });
  },
});

export const quickAdd = action({
  args: {
    childId: v.optional(v.id("children")),
    searchQuery: v.string(),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    dictionaryOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<SignResult> => {
    const userId = await ctx.runQuery(internal.signLookup.getCurrentUserId, {});
    if (!userId) throw new Error("Unauthorized");

    const searchResult = await ctx.runAction(internal.signLookup.search, {
      query: args.searchQuery,
    });
    if (searchResult.results.length === 0) {
      throw new Error(`No sign found for "${args.searchQuery}"`);
    }

    const sign = searchResult.results[0];
    const finalCategory = args.category || sign.category;

    if (args.dictionaryOnly) {
      await ctx.runMutation(internal.signLookup.ensureDictionaryEntry, {
        signId: sign.signId,
        signName: sign.name,
        signCategory: finalCategory,
        lifeprintUrl: sign.lifeprintUrl,
        description: sign.description,
      });
      return { ...sign, category: finalCategory };
    }

    if (!args.childId) throw new Error("childId required when not in dictionaryOnly mode");

    await ctx.runMutation(internal.signLookup.addKnownSign, {
      userId,
      childId: args.childId,
      signId: sign.signId,
      signName: sign.name,
      signCategory: finalCategory,
      notes: args.notes,
      lifeprintUrl: sign.lifeprintUrl,
      description: sign.description,
    });

    return { ...sign, category: finalCategory };
  },
});

export const getSignDetails = query({
  args: { signId: v.string() },
  handler: async (ctx, { signId }) => {
    return await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const allSigns = await ctx.db.query("savedSigns").collect();
    const categories = new Set<string>([...PREDEFINED_CATEGORIES]);

    for (const sign of allSigns) {
      if (sign.category) categories.add(sign.category);
    }

    return [...categories].sort();
  },
});
