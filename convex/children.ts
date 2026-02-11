import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getAuthUser, requireAuth, syncAuthUser } from "./lib/auth";

type ReadCtx = QueryCtx | MutationCtx;

async function getChildAccess(
  ctx: ReadCtx,
  userId: Id<"users">,
  childId: Id<"children">,
) {
  return await ctx.db
    .query("childAccess")
    .withIndex("by_user_child", (q) => q.eq("userId", userId).eq("childId", childId))
    .first();
}

async function requireOwnerAccess(
  ctx: ReadCtx,
  userId: Id<"users">,
  childId: Id<"children">,
) {
  const access = await getChildAccess(ctx, userId, childId);
  if (!access || access.role !== "owner") {
    throw new Error("Only owners can manage sharing");
  }
  return access;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) return [];

    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const children = await Promise.all(
      access.map(async (entry) => {
        const child = await ctx.db.get(entry.childId);
        if (!child) return null;

        const signs = await ctx.db
          .query("knownSigns")
          .withIndex("by_child", (q) => q.eq("childId", entry.childId))
          .collect();

        return {
          ...child,
          role: entry.role,
          signCount: signs.length,
        };
      }),
    );

    return children.filter((child): child is NonNullable<typeof child> => child !== null);
  },
});

export const get = query({
  args: { childId: v.id("children") },
  handler: async (ctx, { childId }) => {
    const user = await getAuthUser(ctx);
    if (!user) return null;

    const access = await getChildAccess(ctx, user._id, childId);
    if (!access) return null;

    const child = await ctx.db.get(childId);
    if (!child) return null;

    const signs = await ctx.db
      .query("knownSigns")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();

    const allAccess = await ctx.db
      .query("childAccess")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .collect();

    const sharedWith = await Promise.all(
      allAccess
        .filter((entry) => entry.userId !== user._id)
        .map(async (entry) => {
          const sharedUser = await ctx.db.get(entry.userId);
          if (!sharedUser) return null;
          return {
            id: sharedUser._id,
            email: sharedUser.email,
            role: entry.role,
          };
        }),
    );

    return {
      ...child,
      role: access.role,
      signs,
      sharedWith: sharedWith.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    birthDate: v.optional(v.string()),
  },
  handler: async (ctx, { name, birthDate }) => {
    const user = await syncAuthUser(ctx);

    const childId = await ctx.db.insert("children", {
      name: name.trim(),
      birthDate,
      createdBy: user._id,
    });

    await ctx.db.insert("childAccess", {
      childId,
      userId: user._id,
      role: "owner",
    });

    return childId;
  },
});

export const update = mutation({
  args: {
    childId: v.id("children"),
    name: v.optional(v.string()),
    birthDate: v.optional(v.string()),
  },
  handler: async (ctx, { childId, name, birthDate }) => {
    const user = await requireAuth(ctx);
    const access = await getChildAccess(ctx, user._id, childId);

    if (!access) {
      throw new Error("Access denied");
    }

    const updates: { name?: string; birthDate?: string } = {};
    if (name !== undefined) updates.name = name.trim();
    if (birthDate !== undefined) updates.birthDate = birthDate;

    await ctx.db.patch(childId, updates);
  },
});

export const share = mutation({
  args: {
    childId: v.id("children"),
    shareWithEmail: v.string(),
  },
  handler: async (ctx, { childId, shareWithEmail }) => {
    const user = await syncAuthUser(ctx);
    await requireOwnerAccess(ctx, user._id, childId);

    const normalizedEmail = shareWithEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("Invalid email");
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (targetUser) {
      const existing = await getChildAccess(ctx, targetUser._id, childId);
      if (existing) {
        throw new Error("Already shared with this user");
      }

      await ctx.db.insert("childAccess", {
        childId,
        userId: targetUser._id,
        role: "shared",
      });

      return { status: "shared", message: "Access granted" };
    }

    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_email_child", (q) => q.eq("invitedEmail", normalizedEmail).eq("childId", childId))
      .first();

    if (existingInvite?.status === "pending") {
      throw new Error("Invite already sent to this email");
    }

    const child = await ctx.db.get(childId);
    const childName = child?.name || "a child";
    const inviterName = user.name || user.email;

    const inviteId = await ctx.db.insert("invites", {
      childId,
      invitedEmail: normalizedEmail,
      invitedBy: user._id,
      role: "shared",
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.insert("emailQueue", {
      to: normalizedEmail,
      subject: `You've been invited to track signs for ${childName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're Invited! 🎉</h2>
          <p><strong>${inviterName}</strong> has invited you to help track sign language progress for <strong>${childName}</strong> on SignTracker.</p>
          <p>Once you create an account with this email address, you'll automatically get access.</p>
          <p style="margin: 24px 0;">
            <a href="https://signtracker.tommytreb.com"
               style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Open SignTracker
            </a>
          </p>
        </div>
      `,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
      ref: { type: "invite", id: inviteId },
    });

    await ctx.scheduler.runAfter(100, internal.emails.processQueue, {});

    return {
      status: "invited",
      message: "Invite sent! They'll get access when they create an account.",
    };
  },
});

export const getPendingInvites = query({
  args: { childId: v.id("children") },
  handler: async (ctx, { childId }) => {
    const user = await getAuthUser(ctx);
    if (!user) return [];

    const access = await getChildAccess(ctx, user._id, childId);
    if (!access || access.role !== "owner") {
      return [];
    }

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_child", (q) => q.eq("childId", childId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return invites.map((invite) => ({
      id: invite._id,
      email: invite.invitedEmail,
      createdAt: invite.createdAt,
    }));
  },
});

export const cancelInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const user = await requireAuth(ctx);
    const invite = await ctx.db.get(inviteId);

    if (!invite) {
      throw new Error("Invite not found");
    }

    await requireOwnerAccess(ctx, user._id, invite.childId);
    await ctx.db.delete(inviteId);
  },
});

export const unshare = mutation({
  args: {
    childId: v.id("children"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { childId, targetUserId }) => {
    const user = await requireAuth(ctx);
    await requireOwnerAccess(ctx, user._id, childId);

    const targetAccess = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", targetUserId).eq("childId", childId))
      .first();

    if (targetAccess && targetAccess.role !== "owner") {
      await ctx.db.delete(targetAccess._id);
    }
  },
});
