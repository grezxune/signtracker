import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to get user by email
async function getUserByEmail(ctx: any, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
}

// Get known signs for a child
export const listKnown = query({
  args: { 
    childId: v.id("children"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { childId, email }) => {
    if (!email) return [];
    
    const user = await getUserByEmail(ctx, email);
    if (!user) return [];
    
    // Check access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();
    
    if (!access) return [];
    
    const signs = await ctx.db
      .query("knownSigns")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();
    
    return signs.sort((a, b) => b.learnedAt - a.learnedAt);
  },
});

// Add a sign to known list
export const addKnown = mutation({
  args: {
    email: v.string(),
    childId: v.id("children"),
    signId: v.string(),
    signName: v.string(),
    signCategory: v.optional(v.string()),
    notes: v.optional(v.string()),
    confidence: v.optional(v.union(
      v.literal("learning"),
      v.literal("familiar"),
      v.literal("mastered")
    )),
  },
  handler: async (ctx, { email, childId, signId, signName, signCategory, notes, confidence }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) throw new Error("User not found");
    
    // Check access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();
    
    if (!access) throw new Error("Access denied");
    
    // Check if already known
    const existing = await ctx.db
      .query("knownSigns")
      .withIndex("by_child_sign", (q) => q.eq("childId", childId).eq("signId", signId))
      .first();
    
    if (existing) {
      throw new Error("Sign already in known list");
    }
    
    return await ctx.db.insert("knownSigns", {
      childId,
      signId,
      signName,
      signCategory,
      learnedAt: Date.now(),
      notes,
      confidence: confidence || "learning",
      addedBy: user._id,
    });
  },
});

// Update a known sign
export const updateKnown = mutation({
  args: {
    email: v.string(),
    knownSignId: v.id("knownSigns"),
    notes: v.optional(v.string()),
    confidence: v.optional(v.union(
      v.literal("learning"),
      v.literal("familiar"),
      v.literal("mastered")
    )),
  },
  handler: async (ctx, { email, knownSignId, notes, confidence }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) throw new Error("User not found");
    
    const knownSign = await ctx.db.get(knownSignId);
    if (!knownSign) throw new Error("Sign not found");
    
    // Check access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", knownSign.childId))
      .first();
    
    if (!access) throw new Error("Access denied");
    
    const updates: Record<string, string> = {};
    if (notes !== undefined) updates.notes = notes;
    if (confidence !== undefined) updates.confidence = confidence;
    
    await ctx.db.patch(knownSignId, updates);
  },
});

// Remove a sign from known list
export const removeKnown = mutation({
  args: { 
    email: v.string(),
    knownSignId: v.id("knownSigns"),
  },
  handler: async (ctx, { email, knownSignId }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) throw new Error("User not found");
    
    const knownSign = await ctx.db.get(knownSignId);
    if (!knownSign) throw new Error("Sign not found");
    
    // Check access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", knownSign.childId))
      .first();
    
    if (!access) throw new Error("Access denied");
    
    await ctx.db.delete(knownSignId);
  },
});

// Check if a sign is known
export const isKnown = query({
  args: { 
    email: v.optional(v.string()),
    childId: v.id("children"),
    signId: v.string(),
  },
  handler: async (ctx, { email, childId, signId }) => {
    if (!email) return false;
    
    const existing = await ctx.db
      .query("knownSigns")
      .withIndex("by_child_sign", (q) => q.eq("childId", childId).eq("signId", signId))
      .first();
    
    return !!existing;
  },
});

// Get sign statistics for a child
export const getStats = query({
  args: { 
    childId: v.id("children"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { childId, email }) => {
    if (!email) return null;
    
    const user = await getUserByEmail(ctx, email);
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
      learning: signs.filter(s => s.confidence === "learning").length,
      familiar: signs.filter(s => s.confidence === "familiar").length,
      mastered: signs.filter(s => s.confidence === "mastered").length,
    };
    
    const byCategory: Record<string, number> = {};
    for (const sign of signs) {
      const cat = sign.signCategory || "Uncategorized";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
    
    // Recent activity (last 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = signs.filter(s => s.learnedAt > weekAgo).length;
    
    return {
      total: signs.length,
      byConfidence,
      byCategory,
      recentCount,
    };
  },
});
