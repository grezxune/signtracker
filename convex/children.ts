import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to get user by email
async function getUserByEmail(ctx: any, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
}

// Get all children the user has access to
export const list = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    if (!email) return [];
    
    const user = await getUserByEmail(ctx, email);
    if (!user) return [];
    
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    const children = await Promise.all(
      access.map(async (a) => {
        const child = await ctx.db.get(a.childId);
        if (!child) return null;
        
        // Get sign count
        const signs = await ctx.db
          .query("knownSigns")
          .withIndex("by_child", (q) => q.eq("childId", a.childId))
          .collect();
        
        return {
          ...child,
          role: a.role,
          signCount: signs.length,
        };
      })
    );
    
    return children.filter(Boolean);
  },
});

// Get a single child with their known signs
export const get = query({
  args: { 
    childId: v.id("children"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { childId, email }) => {
    if (!email) return null;
    
    const user = await getUserByEmail(ctx, email);
    if (!user) return null;
    
    // Check access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();
    
    if (!access) return null;
    
    const child = await ctx.db.get(childId);
    if (!child) return null;
    
    const signs = await ctx.db
      .query("knownSigns")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();
    
    // Get shared users
    const allAccess = await ctx.db
      .query("childAccess")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();
    
    const sharedWith = await Promise.all(
      allAccess
        .filter(a => a.userId !== user._id)
        .map(async (a) => {
          const sharedUser = await ctx.db.get(a.userId);
          return sharedUser ? { id: sharedUser._id, email: sharedUser.email, role: a.role } : null;
        })
    );
    
    return {
      ...child,
      role: access.role,
      signs,
      sharedWith: sharedWith.filter(Boolean),
    };
  },
});

// Create a new child
export const create = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    birthDate: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, birthDate }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) throw new Error("User not found");
    
    const childId = await ctx.db.insert("children", {
      name,
      birthDate,
      createdBy: user._id,
    });
    
    // Give owner access
    await ctx.db.insert("childAccess", {
      childId,
      userId: user._id,
      role: "owner",
    });
    
    return childId;
  },
});

// Update a child
export const update = mutation({
  args: {
    email: v.string(),
    childId: v.id("children"),
    name: v.optional(v.string()),
    birthDate: v.optional(v.string()),
  },
  handler: async (ctx, { email, childId, name, birthDate }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) throw new Error("User not found");
    
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();
    
    if (!access) throw new Error("Access denied");
    
    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (birthDate !== undefined) updates.birthDate = birthDate;
    
    await ctx.db.patch(childId, updates);
  },
});

// Share a child with another user by email
export const share = mutation({
  args: {
    email: v.string(),
    childId: v.id("children"),
    shareWithEmail: v.string(),
  },
  handler: async (ctx, { email, childId, shareWithEmail }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) throw new Error("User not found");
    
    // Check owner access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();
    
    if (!access || access.role !== "owner") {
      throw new Error("Only owners can share");
    }
    
    // Find user by email
    const targetUser = await getUserByEmail(ctx, shareWithEmail);
    
    if (!targetUser) {
      throw new Error("User not found. They need to create an account first.");
    }
    
    // Check if already shared
    const existing = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", targetUser._id).eq("childId", childId))
      .first();
    
    if (existing) {
      throw new Error("Already shared with this user");
    }
    
    await ctx.db.insert("childAccess", {
      childId,
      userId: targetUser._id,
      role: "shared",
    });
  },
});

// Remove sharing
export const unshare = mutation({
  args: {
    email: v.string(),
    childId: v.id("children"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { email, childId, targetUserId }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) throw new Error("User not found");
    
    // Check owner access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();
    
    if (!access || access.role !== "owner") {
      throw new Error("Only owners can manage sharing");
    }
    
    const targetAccess = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", targetUserId).eq("childId", childId))
      .first();
    
    if (targetAccess && targetAccess.role !== "owner") {
      await ctx.db.delete(targetAccess._id);
    }
  },
});
