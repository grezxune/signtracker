import type { MutationCtx, QueryCtx } from "../_generated/server";
import { logDeniedAttemptAndAlert } from "../lib/audit";
import { normalizeEmail } from "./helpers";

type ReadCtx = QueryCtx | MutationCtx;

export async function getAuthUserByIdentity(ctx: ReadCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const email = normalizeEmail(typeof identity?.email === "string" ? identity.email : undefined);
  if (!email) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
}

export async function requireSuperUser(ctx: MutationCtx) {
  const user = await getAuthUserByIdentity(ctx);
  if (!user || user.role !== "super_user") {
    await logDeniedAttemptAndAlert(ctx, {
      eventType: "admin.super_user_required",
      actorUserId: user?._id,
      actorEmail: user?.email,
      targetType: "admin_route",
      details: "Super user role required",
    });
    throw new Error("Access denied: super_user role required");
  }

  return user;
}
