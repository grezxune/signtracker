import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUser } from "./lib/auth";
import { logAuditEvent } from "./lib/audit";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type ReadCtx = QueryCtx | MutationCtx;

async function requireSuperUser(ctx: ReadCtx) {
  const user = await getAuthUser(ctx);
  if (!user || user.role !== "super_user") {
    throw new Error("Access denied: super_user role required");
  }
  return user;
}

export const getSecurityOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperUser(ctx);

    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const [openAlerts, resolvedAlerts, recentDenied] = await Promise.all([
      ctx.db
        .query("securityAlerts")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "open"))
        .collect(),
      ctx.db
        .query("securityAlerts")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "resolved"))
        .collect(),
      ctx.db
        .query("auditEvents")
        .withIndex("by_outcome_createdAt", (q) => q.eq("outcome", "denied").gte("createdAt", last24h))
        .collect(),
    ]);

    return {
      openAlerts: openAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      deniedLast24h: recentDenied.length,
      topDeniedEvents: Object.entries(
        recentDenied.reduce<Record<string, number>>((acc, event) => {
          acc[event.eventType] = (acc[event.eventType] || 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([eventType, count]) => ({ eventType, count })),
    };
  },
});

export const listSecurityAlerts = query({
  args: {
    status: v.optional(v.union(v.literal("open"), v.literal("resolved"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status = "open", limit = 100 }) => {
    await requireSuperUser(ctx);

    const alerts = await ctx.db
      .query("securityAlerts")
      .withIndex("by_status_createdAt", (q) => q.eq("status", status))
      .order("desc")
      .take(limit);

    return await Promise.all(
      alerts.map(async (alert) => {
        const resolvedBy = alert.resolvedBy ? await ctx.db.get(alert.resolvedBy) : null;
        return {
          ...alert,
          resolvedByEmail: resolvedBy?.email,
        };
      }),
    );
  },
});

export const listAuditEvents = query({
  args: {
    outcome: v.optional(v.union(v.literal("success"), v.literal("denied"), v.literal("error"))),
    eventType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { outcome, eventType, limit = 200 }) => {
    await requireSuperUser(ctx);

    const events = outcome
      ? await ctx.db
          .query("auditEvents")
          .withIndex("by_outcome_createdAt", (q) => q.eq("outcome", outcome))
          .order("desc")
          .take(limit)
      : await ctx.db.query("auditEvents").withIndex("by_createdAt").order("desc").take(limit);

    if (!eventType) return events;
    return events.filter((event) => event.eventType === eventType);
  },
});

export const resolveSecurityAlert = mutation({
  args: { alertId: v.id("securityAlerts"), resolutionNotes: v.optional(v.string()) },
  handler: async (ctx, { alertId, resolutionNotes }) => {
    const user = await requireSuperUser(ctx);
    const alert = await ctx.db.get(alertId);
    if (!alert) throw new Error("Alert not found");
    if (alert.status === "resolved") return { alreadyResolved: true };

    await ctx.db.patch(alertId, {
      status: "resolved",
      resolvedAt: Date.now(),
      resolvedBy: user._id,
      resolutionNotes,
    });

    await logAuditEvent(ctx, {
      eventType: "security.alert_resolved",
      outcome: "success",
      actorUserId: user._id,
      actorEmail: user.email,
      targetType: "security_alert",
      targetId: String(alertId),
      details: resolutionNotes,
    });

    return { resolved: true };
  },
});
