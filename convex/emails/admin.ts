import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireSuperUser } from "./auth";

const MAX_ATTEMPTS = 3;

export const getQueueStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperUser(ctx);

    const [pending, sending, failed] = await Promise.all([
      ctx.db.query("emailQueue").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
      ctx.db.query("emailQueue").withIndex("by_status", (q) => q.eq("status", "sending")).collect(),
      ctx.db
        .query("emailQueue")
        .withIndex("by_status", (q) => q.eq("status", "failed"))
        .filter((q) => q.lt(q.field("attempts"), MAX_ATTEMPTS))
        .collect(),
    ]);

    return { pending: pending.length, sending: sending.length, retriable: failed.length };
  },
});

export const getFailedEmails = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperUser(ctx);

    const failed = await ctx.db
      .query("emailQueue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();

    return failed.map((email) => ({
      id: email._id,
      to: email.to,
      subject: email.subject,
      error: email.error,
      attempts: email.attempts,
      createdAt: email.createdAt,
    }));
  },
});

export const retryFailed = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSuperUser(ctx);

    const failed = await ctx.db
      .query("emailQueue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();

    let retriedCount = 0;
    for (const email of failed) {
      await ctx.db.patch(email._id, { status: "pending", error: undefined });
      retriedCount += 1;
    }

    if (retriedCount > 0) {
      await ctx.scheduler.runAfter(100, internal.emails.processQueue, {});
    }

    return { retriedCount };
  },
});
