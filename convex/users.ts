import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create user by email (called after NextAuth sign in)
export const getOrCreate = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, image, provider }) => {
    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    
    if (existing) {
      // Update name/image if provided
      if (name || image) {
        await ctx.db.patch(existing._id, {
          ...(name && { name }),
          ...(image && { image }),
        });
      }
      return existing._id;
    }
    
    // Create new user
    return await ctx.db.insert("users", {
      email,
      name,
      image,
      provider,
      emailVerified: true, // Verified via OAuth or magic link
      createdAt: Date.now(),
    });
  },
});

// Get user by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

// Get current user (by email from session)
export const current = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    if (!email) return null;
    
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});
