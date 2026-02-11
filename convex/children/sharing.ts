import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthUser, requireAuth, syncAuthUser } from "../lib/auth";
import { logAuditEvent } from "../lib/audit";
import { getChildAccess, requireOwnerAccess } from "./helpers";
import { buildInviteEmailHtml } from "./inviteTemplate";

const DEFAULT_APP_URL = "https://signtracker.tommytreb.com";

export const share = mutation({
  args: { childId: v.id("children"), shareWithEmail: v.string() },
  handler: async (ctx, { childId, shareWithEmail }) => {
    const user = await syncAuthUser(ctx);
    await requireOwnerAccess(ctx, user._id, childId, user.email);

    const normalizedEmail = shareWithEmail.trim().toLowerCase();
    if (!normalizedEmail) throw new Error("Invalid email");

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (targetUser) {
      const existing = await getChildAccess(ctx, targetUser._id, childId);
      if (existing) throw new Error("Already shared with this user");

      await ctx.db.insert("childAccess", {
        childId,
        userId: targetUser._id,
        role: "shared",
      });

      await logAuditEvent(ctx, {
        eventType: "children.shared_access_granted",
        outcome: "success",
        actorUserId: user._id,
        actorEmail: user.email,
        targetType: "child_access",
        targetId: `${childId}:${targetUser._id}`,
        details: `Granted access to ${normalizedEmail}`,
      });

      return { status: "shared", message: "Access granted" } as const;
    }

    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_email_child", (q) => q.eq("invitedEmail", normalizedEmail).eq("childId", childId))
      .first();

    if (existingInvite?.status === "pending") {
      throw new Error("Invite already sent to this email");
    }

    const child = await ctx.db.get(childId);
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
      subject: `You've been invited to track signs for ${child?.name || "a child"}`,
      html: buildInviteEmailHtml({
        inviterName: user.name || user.email,
        childName: child?.name || "a child",
        appUrl: process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL,
      }),
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
      ref: { type: "invite", id: String(inviteId) },
    });

    await ctx.scheduler.runAfter(100, internal.emails.processQueue, {});

    await logAuditEvent(ctx, {
      eventType: "children.share_invite_created",
      outcome: "success",
      actorUserId: user._id,
      actorEmail: user.email,
      targetType: "invite",
      targetId: String(inviteId),
      details: `Invite created for ${normalizedEmail}`,
    });

    return {
      status: "invited",
      message: "Invite sent! They'll get access when they create an account.",
    } as const;
  },
});

export const getPendingInvites = query({
  args: { childId: v.id("children") },
  handler: async (ctx, { childId }) => {
    const user = await getAuthUser(ctx);
    if (!user) return [];

    const access = await getChildAccess(ctx, user._id, childId);
    if (!access || access.role !== "owner") return [];

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
    if (!invite) throw new Error("Invite not found");

    await requireOwnerAccess(ctx, user._id, invite.childId, user.email);
    await ctx.db.delete(inviteId);

    await logAuditEvent(ctx, {
      eventType: "children.invite_cancelled",
      outcome: "success",
      actorUserId: user._id,
      actorEmail: user.email,
      targetType: "invite",
      targetId: String(inviteId),
    });
  },
});

export const unshare = mutation({
  args: { childId: v.id("children"), targetUserId: v.id("users") },
  handler: async (ctx, { childId, targetUserId }) => {
    const user = await requireAuth(ctx);
    await requireOwnerAccess(ctx, user._id, childId, user.email);

    const targetAccess = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", targetUserId).eq("childId", childId))
      .first();

    if (!targetAccess || targetAccess.role === "owner") return;

    await ctx.db.delete(targetAccess._id);
    await logAuditEvent(ctx, {
      eventType: "children.access_revoked",
      outcome: "success",
      actorUserId: user._id,
      actorEmail: user.email,
      targetType: "child_access",
      targetId: `${childId}:${targetUserId}`,
    });
  },
});
