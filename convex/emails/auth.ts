import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthUser } from "../lib/auth";

type ReadCtx = QueryCtx | MutationCtx;

export async function requireSuperUser(ctx: ReadCtx) {
  const user = await getAuthUser(ctx);
  if (!user || user.role !== "super_user") {
    throw new Error("Access denied: super_user role required");
  }
  return user;
}
