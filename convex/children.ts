import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all children the user has access to
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
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
  args: { childId: v.id("children") },
  handler: async (ctx, { childId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    // Check access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", userId).eq("childId", childId))
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
        .filter(a => a.userId !== userId)
        .map(async (a) => {
          const user = await ctx.db.get(a.userId);
          return user ? { id: user._id, email: user.email, role: a.role } : null;
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
    name: v.string(),
    birthDate: v.optional(v.string()),
  },
  handler: async (ctx, { name, birthDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const childId = await ctx.db.insert("children", {
      name,
      birthDate,
      createdBy: userId,
    });
    
    // Give owner access
    await ctx.db.insert("childAccess", {
      childId,
      userId,
      role: "owner",
    });
    
    return childId;
  },
});

// Update a child
export const update = mutation({
  args: {
    childId: v.id("children"),
    name: v.optional(v.string()),
    birthDate: v.optional(v.string()),
  },
  handler: async (ctx, { childId, name, birthDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", userId).eq("childId", childId))
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
    childId: v.id("children"),
    email: v.string(),
  },
  handler: async (ctx, { childId, email }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Check owner access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", userId).eq("childId", childId))
      .first();
    
    if (!access || access.role !== "owner") {
      throw new Error("Only owners can share");
    }
    
    // Find user by email
    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    
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
    childId: v.id("children"),
    userId: v.id("users"),
  },
  handler: async (ctx, { childId, userId: targetUserId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Check owner access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", userId).eq("childId", childId))
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
