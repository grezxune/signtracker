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

// Update sign name (personal copy - doesn't affect dictionary)
export const updateSignName = mutation({
  args: {
    email: v.string(),
    knownSignId: v.id("knownSigns"),
    signName: v.string(),
  },
  handler: async (ctx, { email, knownSignId, signName }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) throw new Error("User not found");
    
    const sign = await ctx.db.get(knownSignId);
    if (!sign) throw new Error("Sign not found");
    
    // Check access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", sign.childId))
      .first();
    
    if (!access) throw new Error("Access denied");
    
    const trimmedName = signName.trim();
    if (!trimmedName) throw new Error("Sign name cannot be empty");
    
    // Update the personal copy's signName
    // Note: signId stays the same (links to original dictionary entry for Lifeprint URL)
    await ctx.db.patch(knownSignId, { signName: trimmedName });
    
    return { success: true };
  },
});

// Update alias (custom name the child uses)
export const updateAlias = mutation({
  args: {
    email: v.string(),
    knownSignId: v.id("knownSigns"),
    alias: v.union(v.string(), v.null()), // null to clear
  },
  handler: async (ctx, { email, knownSignId, alias }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) throw new Error("User not found");
    
    const sign = await ctx.db.get(knownSignId);
    if (!sign) throw new Error("Sign not found");
    
    // Check access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", sign.childId))
      .first();
    
    if (!access) throw new Error("Access denied");
    
    // Update alias (null/empty clears it)
    const newAlias = alias === null || alias.trim() === "" ? undefined : alias.trim();
    await ctx.db.patch(knownSignId, { alias: newAlias });
    
    return { success: true };
  },
});

// Toggle favorite status on a sign
export const toggleFavorite = mutation({
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
    
    // Toggle favorite
    const newFavorite = !knownSign.favorite;
    await ctx.db.patch(knownSignId, { favorite: newFavorite });
    
    return newFavorite;
  },
});

// Get known signs organized by category
export const listByCategory = query({
  args: { 
    childId: v.id("children"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { childId, email }) => {
    if (!email) return { favorites: [], categories: {}, allCategories: [] };
    
    const user = await getUserByEmail(ctx, email);
    if (!user) return { favorites: [], categories: {}, allCategories: [] };
    
    // Check access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();
    
    if (!access) return { favorites: [], categories: {}, allCategories: [] };
    
    const signs = await ctx.db
      .query("knownSigns")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();
    
    // Get sign details for Lifeprint URLs
    const signDetails = await Promise.all(
      signs.map(async (s) => {
        const details = await ctx.db
          .query("savedSigns")
          .withIndex("by_sign_id", (q) => q.eq("signId", s.signId))
          .first();
        return {
          ...s,
          lifeprintUrl: details?.lifeprintUrl || getLifeprintUrl(s.signName),
        };
      })
    );
    
    // Separate favorites
    const favorites = signDetails.filter(s => s.favorite);
    
    // Group by category - include ALL categories that exist in the data
    const categories: Record<string, typeof signDetails> = {};
    for (const sign of signDetails) {
      const cat = sign.signCategory || "General";
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push(sign);
    }
    
    // Sort signs within each category by display name (alias or signName)
    for (const cat of Object.keys(categories)) {
      categories[cat].sort((a, b) => {
        const nameA = a.alias || a.signName;
        const nameB = b.alias || b.signName;
        return nameA.localeCompare(nameB);
      });
    }
    
    // Sort favorites by display name too
    favorites.sort((a, b) => {
      const nameA = a.alias || a.signName;
      const nameB = b.alias || b.signName;
      return nameA.localeCompare(nameB);
    });
    
    // Return all category names that exist
    const allCategories = Object.keys(categories).sort();
    
    return { favorites, categories, allCategories };
  },
});

// Helper to generate Lifeprint URL
function getLifeprintUrl(word: string): string {
  const firstLetter = word.charAt(0).toLowerCase();
  const slug = word.toLowerCase().replace(/\s+/g, "-");
  return `https://www.lifeprint.com/asl101/pages-signs/${firstLetter}/${slug}.htm`;
}

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
