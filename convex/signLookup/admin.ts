import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { logAuditEvent } from "../lib/audit";
import { getAuthUserByIdentity, requireSuperUser } from "./auth";

export const isSuperUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUserByIdentity(ctx);
    return user?.role === "super_user";
  },
});

export const editDictionaryEntry = mutation({
  args: {
    signId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    lifeprintUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireSuperUser(ctx);

    const entry = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", args.signId))
      .first();
    if (!entry) throw new Error("Dictionary entry not found");

    const updates: Record<string, string> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.lifeprintUrl !== undefined) updates.lifeprintUrl = args.lifeprintUrl;

    await ctx.db.patch(entry._id, updates);

    await logAuditEvent(ctx, {
      eventType: "dictionary.entry_updated",
      outcome: "success",
      actorUserId: user._id,
      actorEmail: user.email,
      targetType: "dictionary_entry",
      targetId: args.signId,
    });

    return { success: true, signId: args.signId };
  },
});

export const deleteDictionaryEntry = mutation({
  args: { signId: v.string() },
  handler: async (ctx, { signId }) => {
    const user = await requireSuperUser(ctx);

    const entry = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
    if (!entry) throw new Error("Dictionary entry not found");

    const knownSigns = await ctx.db
      .query("knownSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .collect();

    for (const knownSign of knownSigns) {
      await ctx.db.delete(knownSign._id);
    }

    await ctx.db.delete(entry._id);

    await logAuditEvent(ctx, {
      eventType: "dictionary.entry_deleted",
      outcome: "success",
      actorUserId: user._id,
      actorEmail: user.email,
      targetType: "dictionary_entry",
      targetId: signId,
      details: `Removed from ${knownSigns.length} child profiles`,
    });

    return { success: true, signId, deletedFromProfiles: knownSigns.length };
  },
});

export const setUserRole = mutation({
  args: {
    targetEmail: v.string(),
    role: v.union(v.literal("user"), v.literal("super_user")),
  },
  handler: async (ctx, { targetEmail, role }) => {
    const user = await requireSuperUser(ctx);

    const normalizedEmail = targetEmail.toLowerCase().trim();
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (!targetUser) throw new Error("Target user not found");

    await ctx.db.patch(targetUser._id, { role });

    await logAuditEvent(ctx, {
      eventType: "admin.user_role_changed",
      outcome: "success",
      actorUserId: user._id,
      actorEmail: user.email,
      targetType: "user",
      targetId: String(targetUser._id),
      details: `Role set to ${role}`,
    });

    return { success: true, targetEmail: normalizedEmail, role };
  },
});
