import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUser, requireAuth, syncAuthUser } from "../lib/auth";
import { getChildAccess } from "./helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) return [];

    const accessEntries = await ctx.db
      .query("childAccess")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const children = await Promise.all(
      accessEntries.map(async (entry) => {
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

    const [signs, allAccess] = await Promise.all([
      ctx.db.query("knownSigns").withIndex("by_child", (q) => q.eq("childId", childId)).collect(),
      ctx.db.query("childAccess").withIndex("by_child", (q) => q.eq("childId", childId)).collect(),
    ]);

    const sharedWith = await Promise.all(
      allAccess
        .filter((entry) => entry.userId !== user._id)
        .map(async (entry) => {
          const sharedUser = await ctx.db.get(entry.userId);
          if (!sharedUser) return null;
          return { id: sharedUser._id, email: sharedUser.email, role: entry.role };
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
  args: { name: v.string(), birthDate: v.optional(v.string()) },
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
    if (!access) throw new Error("Access denied");

    const updates: { name?: string; birthDate?: string } = {};
    if (name !== undefined) updates.name = name.trim();
    if (birthDate !== undefined) updates.birthDate = birthDate;

    await ctx.db.patch(childId, updates);
  },
});
