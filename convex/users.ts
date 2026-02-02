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
    const normalizedEmail = email.toLowerCase();
    
    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
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
    const userId = await ctx.db.insert("users", {
      email: normalizedEmail,
      name,
      image,
      provider,
      emailVerified: true, // Verified via OAuth or magic link
      createdAt: Date.now(),
    });
    
    // Check for pending invites and grant access
    const pendingInvites = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("invitedEmail", normalizedEmail))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    
    for (const invite of pendingInvites) {
      // Grant access to the child
      await ctx.db.insert("childAccess", {
        childId: invite.childId,
        userId: userId,
        role: invite.role,
      });
      
      // Mark invite as accepted
      await ctx.db.patch(invite._id, {
        status: "accepted",
        acceptedAt: Date.now(),
      });
    }
    
    return userId;
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

// Bootstrap: Set first super_user (only works if no super_users exist)
export const bootstrapSuperUser = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Check if any super_user already exists
    const allUsers = await ctx.db.query("users").collect();
    const existingSuperUser = allUsers.find(u => u.role === "super_user");
    
    if (existingSuperUser) {
      throw new Error("A super_user already exists. Use setUserRole instead.");
    }
    
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    await ctx.db.patch(user._id, { role: "super_user" });
    
    return { success: true, email };
  },
});
