import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUser, requireAuth } from "../lib/auth";
import { ensureChildAccess, getKnownSignForUser, type Confidence } from "./helpers";

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
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await ensureChildAccess(ctx, user._id, args.childId);

    const normalizedSignId = args.signId.trim().toLowerCase();
    const existing = await ctx.db
      .query("knownSigns")
      .withIndex("by_child_sign", (q) => q.eq("childId", args.childId).eq("signId", normalizedSignId))
      .first();
    if (existing) throw new Error("Sign already in known list");

    return await ctx.db.insert("knownSigns", {
      childId: args.childId,
      signId: normalizedSignId,
      signName: args.signName.trim(),
      signCategory: args.signCategory,
      learnedAt: Date.now(),
      notes: args.notes,
      confidence: args.confidence ?? "learning",
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
  args: { childId: v.id("children"), signId: v.string() },
  handler: async (ctx, { childId, signId }) => {
    const user = await getAuthUser(ctx);
    if (!user) return false;

    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();
    if (!access) return false;

    const existing = await ctx.db
      .query("knownSigns")
      .withIndex("by_child_sign", (q) => q.eq("childId", childId).eq("signId", signId.trim().toLowerCase()))
      .first();

    return Boolean(existing);
  },
});
