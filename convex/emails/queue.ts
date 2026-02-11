import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

const MAX_ATTEMPTS = 3;
const PROCESS_INTERVAL_MS = 1000;

export const queue = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    ref: v.optional(v.object({ type: v.string(), id: v.string() })),
  },
  handler: async (ctx, { to, subject, html, ref }) => {
    const emailId = await ctx.db.insert("emailQueue", {
      to,
      subject,
      html,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
      ref,
    });

    await ctx.scheduler.runAfter(100, internal.emails.processQueue, {});
    return emailId;
  },
});

export const processQueue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pendingEmail = await ctx.db
      .query("emailQueue")
      .withIndex("by_status_created", (q) => q.eq("status", "pending"))
      .first();

    if (!pendingEmail) {
      const failedEmail = await ctx.db
        .query("emailQueue")
        .withIndex("by_status", (q) => q.eq("status", "failed"))
        .filter((q) => q.lt(q.field("attempts"), MAX_ATTEMPTS))
        .first();

      if (!failedEmail) return;
      await ctx.db.patch(failedEmail._id, { status: "sending", lastAttempt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.emails.sendEmail, { emailId: failedEmail._id });
      return;
    }

    await ctx.db.patch(pendingEmail._id, { status: "sending", lastAttempt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.emails.sendEmail, { emailId: pendingEmail._id });
  },
});

export const sendEmail = internalAction({
  args: { emailId: v.id("emailQueue") },
  handler: async (ctx, { emailId }) => {
    const email = await ctx.runQuery(internal.emails.getEmailById, { emailId });
    if (!email || email.status !== "sending") return;

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.emails.markFailed, {
        emailId,
        error: "AUTH_RESEND_KEY not configured",
      });
      return;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SignTracker <signtracker@tommytreb.com>",
          to: email.to,
          subject: email.subject,
          html: email.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error: ${response.status} - ${errorText}`);
      }

      await ctx.runMutation(internal.emails.markSent, { emailId });
      await ctx.scheduler.runAfter(PROCESS_INTERVAL_MS, internal.emails.processQueue, {});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.emails.markFailed, { emailId, error: errorMessage });
      await ctx.scheduler.runAfter(PROCESS_INTERVAL_MS * 5, internal.emails.processQueue, {});
    }
  },
});

export const getEmailById = internalQuery({
  args: { emailId: v.id("emailQueue") },
  handler: async (ctx, { emailId }) => await ctx.db.get(emailId),
});

export const markSent = internalMutation({
  args: { emailId: v.id("emailQueue") },
  handler: async (ctx, { emailId }) => {
    await ctx.db.patch(emailId, { status: "sent", sentAt: Date.now() });
  },
});

export const markFailed = internalMutation({
  args: { emailId: v.id("emailQueue"), error: v.string() },
  handler: async (ctx, { emailId, error }) => {
    const email = await ctx.db.get(emailId);
    if (!email) return;
    await ctx.db.patch(emailId, {
      status: "failed",
      attempts: email.attempts + 1,
      error,
    });
  },
});
