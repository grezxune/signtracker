import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { getKnownSignForUser } from "./helpers";

export const updateSignName = mutation({
  args: { knownSignId: v.id("knownSigns"), signName: v.string() },
  handler: async (ctx, { knownSignId, signName }) => {
    const user = await requireAuth(ctx);
    await getKnownSignForUser(ctx, user._id, knownSignId);

    const trimmed = signName.trim();
    if (!trimmed) throw new Error("Sign name cannot be empty");

    await ctx.db.patch(knownSignId, { signName: trimmed });
    return { success: true };
  },
});

export const updateAlias = mutation({
  args: { knownSignId: v.id("knownSigns"), alias: v.union(v.string(), v.null()) },
  handler: async (ctx, { knownSignId, alias }) => {
    const user = await requireAuth(ctx);
    await getKnownSignForUser(ctx, user._id, knownSignId);

    const normalizedAlias = alias === null || alias.trim() === "" ? undefined : alias.trim();
    await ctx.db.patch(knownSignId, { alias: normalizedAlias });

    return { success: true };
  },
});

export const toggleFavorite = mutation({
  args: { knownSignId: v.id("knownSigns") },
  handler: async (ctx, { knownSignId }) => {
    const user = await requireAuth(ctx);
    const knownSign = await getKnownSignForUser(ctx, user._id, knownSignId);

    const favorite = !knownSign.favorite;
    await ctx.db.patch(knownSignId, { favorite });
    return favorite;
  },
});
