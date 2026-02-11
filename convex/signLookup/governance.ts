import { query } from "../_generated/server";
import { getAuthUserByIdentity } from "./auth";

export const getDictionaryGovernanceStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUserByIdentity(ctx);
    if (!user || user.role !== "super_user") {
      throw new Error("Access denied: super_user role required");
    }

    const [pending, approved, rejected] = await Promise.all([
      ctx.db
        .query("dictionarySuggestions")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "pending"))
        .collect(),
      ctx.db
        .query("dictionarySuggestions")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "approved"))
        .collect(),
      ctx.db
        .query("dictionarySuggestions")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "rejected"))
        .collect(),
    ]);

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
    };
  },
});
