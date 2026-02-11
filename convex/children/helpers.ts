import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { logDeniedAttemptAndAlert } from "../lib/audit";

type ReadCtx = QueryCtx | MutationCtx;

export async function getChildAccess(
  ctx: ReadCtx,
  userId: Id<"users">,
  childId: Id<"children">,
) {
  return await ctx.db
    .query("childAccess")
    .withIndex("by_user_child", (q) => q.eq("userId", userId).eq("childId", childId))
    .first();
}

function isMutationContext(ctx: ReadCtx): ctx is MutationCtx {
  return "scheduler" in ctx;
}

export async function requireOwnerAccess(
  ctx: ReadCtx,
  userId: Id<"users">,
  childId: Id<"children">,
  actorEmail?: string,
) {
  const access = await getChildAccess(ctx, userId, childId);
  if (!access || access.role !== "owner") {
    if (isMutationContext(ctx)) {
      await logDeniedAttemptAndAlert(ctx, {
        eventType: "children.owner_access_denied",
        actorUserId: userId,
        actorEmail,
        targetType: "child",
        targetId: String(childId),
        details: "Owner role required",
      });
    }
    throw new Error("Only owners can manage sharing");
  }

  return access;
}
