import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type AuditOutcome = "success" | "denied" | "error";

type AuditEventInput = {
  eventType: string;
  outcome: AuditOutcome;
  actorUserId?: Id<"users">;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  details?: string;
};

const ALERT_THRESHOLD = 5;
const ALERT_WINDOW_MS = 15 * 60 * 1000;

function normalizeEmail(value?: string) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : undefined;
}

export async function logAuditEvent(ctx: MutationCtx, event: AuditEventInput) {
  await ctx.db.insert("auditEvents", {
    eventType: event.eventType,
    outcome: event.outcome,
    actorUserId: event.actorUserId,
    actorEmail: normalizeEmail(event.actorEmail),
    targetType: event.targetType,
    targetId: event.targetId,
    details: event.details,
    createdAt: Date.now(),
  });
}

export async function logDeniedAttemptAndAlert(ctx: MutationCtx, event: Omit<AuditEventInput, "outcome">) {
  const actorEmail = normalizeEmail(event.actorEmail);

  await logAuditEvent(ctx, {
    ...event,
    actorEmail,
    outcome: "denied",
  });

  if (!actorEmail) return;

  const now = Date.now();
  const windowStart = now - ALERT_WINDOW_MS;

  const recent = await ctx.db
    .query("auditEvents")
    .withIndex("by_actorEmail_createdAt", (q) => q.eq("actorEmail", actorEmail).gte("createdAt", windowStart))
    .filter((q) =>
      q.and(
        q.eq(q.field("eventType"), event.eventType),
        q.eq(q.field("outcome"), "denied"),
      ),
    )
    .collect();

  if (recent.length < ALERT_THRESHOLD) return;

  const openAlert = await ctx.db
    .query("securityAlerts")
    .withIndex("by_actor_status", (q) => q.eq("actorEmail", actorEmail).eq("status", "open"))
    .filter((q) => q.eq(q.field("eventType"), event.eventType))
    .first();

  if (openAlert) return;

  await ctx.db.insert("securityAlerts", {
    actorEmail,
    eventType: event.eventType,
    threshold: ALERT_THRESHOLD,
    countInWindow: recent.length,
    windowStart,
    windowEnd: now,
    status: "open",
    createdAt: now,
  });
}
