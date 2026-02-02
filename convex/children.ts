import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

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
    
    if (targetUser) {
      // User exists - check if already shared
      const existing = await ctx.db
        .query("childAccess")
        .withIndex("by_user_child", (q) => q.eq("userId", targetUser._id).eq("childId", childId))
        .first();
      
      if (existing) {
        throw new Error("Already shared with this user");
      }
      
      // Grant immediate access
      await ctx.db.insert("childAccess", {
        childId,
        userId: targetUser._id,
        role: "shared",
      });
      
      return { status: "shared", message: "Access granted" };
    } else {
      // User doesn't exist - create an invite
      const existingInvite = await ctx.db
        .query("invites")
        .withIndex("by_email_child", (q) => 
          q.eq("invitedEmail", shareWithEmail.toLowerCase()).eq("childId", childId)
        )
        .first();
      
      if (existingInvite && existingInvite.status === "pending") {
        throw new Error("Invite already sent to this email");
      }
      
      // Get child name for the email
      const child = await ctx.db.get(childId);
      const childName = child?.name || "a child";
      const inviterName = user.name || user.email;
      
      const inviteId = await ctx.db.insert("invites", {
        childId,
        invitedEmail: shareWithEmail.toLowerCase(),
        invitedBy: user._id,
        role: "shared",
        status: "pending",
        createdAt: Date.now(),
      });
      
      // Queue invite email
      await ctx.db.insert("emailQueue", {
        to: shareWithEmail.toLowerCase(),
        subject: `You've been invited to track signs for ${childName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You're Invited! 🎉</h2>
            <p><strong>${inviterName}</strong> has invited you to help track sign language progress for <strong>${childName}</strong> on SignTracker.</p>
            <p>SignTracker helps families track and celebrate their child's sign language journey.</p>
            <p style="margin: 24px 0;">
              <a href="https://signtracker.tommytreb.com" 
                 style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Create Your Account
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Once you create an account with this email address (${shareWithEmail.toLowerCase()}), 
              you'll automatically get access to ${childName}'s sign tracking.
            </p>
          </div>
        `,
        status: "pending",
        attempts: 0,
        createdAt: Date.now(),
        ref: { type: "invite", id: inviteId },
      });
      
      // Trigger email processing
      await ctx.scheduler.runAfter(100, internal.emails.processQueue, {});
      
      return { status: "invited", message: "Invite sent! They'll get access when they create an account." };
    }
  },
});

// Get pending invites for a child
export const getPendingInvites = query({
  args: {
    email: v.string(),
    childId: v.id("children"),
  },
  handler: async (ctx, { email, childId }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) return [];
    
    // Check owner access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
      .first();
    
    if (!access || access.role !== "owner") {
      return [];
    }
    
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    
    return invites.map(inv => ({
      id: inv._id,
      email: inv.invitedEmail,
      createdAt: inv.createdAt,
    }));
  },
});

// Cancel a pending invite
export const cancelInvite = mutation({
  args: {
    email: v.string(),
    inviteId: v.id("invites"),
  },
  handler: async (ctx, { email, inviteId }) => {
    const user = await getUserByEmail(ctx, email);
    if (!user) throw new Error("User not found");
    
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Invite not found");
    
    // Check owner access to the child
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", invite.childId))
      .first();
    
    if (!access || access.role !== "owner") {
      throw new Error("Only owners can cancel invites");
    }
    
    await ctx.db.delete(inviteId);
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
