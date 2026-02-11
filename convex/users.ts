import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getAuthUser, syncAuthUser } from "./lib/auth";

async function acceptPendingInvitesForUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string,
) {
  const pendingInvites = await ctx.db
    .query("invites")
    .withIndex("by_email", (q) => q.eq("invitedEmail", email))
    .filter((q) => q.eq(q.field("status"), "pending"))
    .collect();

  for (const invite of pendingInvites) {
    const existingAccess = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", userId).eq("childId", invite.childId))
      .first();

    if (!existingAccess) {
      await ctx.db.insert("childAccess", {
        childId: invite.childId,
        userId,
        role: invite.role,
      });
    }

    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });
  }

  return pendingInvites.length;
}

export const syncCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await syncAuthUser(ctx);
    const acceptedInvites = await acceptPendingInvitesForUser(ctx, user._id, user.email);

    return {
      userId: user._id,
      acceptedInvites,
    };
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUser(ctx);
  },
});

export const bootstrapSuperUser = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await syncAuthUser(ctx);

    const allUsers = await ctx.db.query("users").collect();
    const existingSuperUser = allUsers.find((entry) => entry.role === "super_user");

    if (existingSuperUser && existingSuperUser._id !== user._id) {
      throw new Error("A super_user already exists.");
    }

    await ctx.db.patch(user._id, { role: "super_user" });
    return { success: true, email: user.email };
  },
});

export const setUserRole = mutation({
  args: {
    targetEmail: v.string(),
    role: v.union(v.literal("user"), v.literal("super_user")),
  },
  handler: async (ctx, { targetEmail, role }) => {
    const requester = await syncAuthUser(ctx);
    if (requester.role !== "super_user") {
      throw new Error("Access denied: super_user role required");
    }

    const target = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", targetEmail.toLowerCase()))
      .first();

    if (!target) {
      throw new Error("Target user not found");
    }

    await ctx.db.patch(target._id, { role });
    return { success: true, targetEmail: target.email, role };
  },
});
