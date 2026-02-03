import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 1; // Process 1 at a time to stay well under 2 TPS
const PROCESS_INTERVAL_MS = 1000; // 1 second between sends

// Queue an email for sending
export const queue = mutation({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    ref: v.optional(v.object({
      type: v.string(),
      id: v.string(),
    })),
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
    
    // Schedule processing
    await ctx.scheduler.runAfter(100, internal.emails.processQueue, {});
    
    return emailId;
  },
});

// Internal: Process the email queue
export const processQueue = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get oldest pending email
    const pendingEmail = await ctx.db
      .query("emailQueue")
      .withIndex("by_status_created", (q) => q.eq("status", "pending"))
      .first();
    
    if (!pendingEmail) {
      // Also check for failed emails that can be retried
      const failedEmail = await ctx.db
        .query("emailQueue")
        .withIndex("by_status", (q) => q.eq("status", "failed"))
        .filter((q) => q.lt(q.field("attempts"), MAX_ATTEMPTS))
        .first();
      
      if (!failedEmail) {
        return; // Nothing to process
      }
      
      // Retry failed email
      await ctx.db.patch(failedEmail._id, {
        status: "sending",
        lastAttempt: Date.now(),
      });
      
      await ctx.scheduler.runAfter(0, internal.emails.sendEmail, {
        emailId: failedEmail._id,
      });
      return;
    }
    
    // Mark as sending
    await ctx.db.patch(pendingEmail._id, {
      status: "sending",
      lastAttempt: Date.now(),
    });
    
    // Send the email
    await ctx.scheduler.runAfter(0, internal.emails.sendEmail, {
      emailId: pendingEmail._id,
    });
  },
});

// Internal: Actually send the email via Resend
export const sendEmail = internalAction({
  args: { emailId: v.id("emailQueue") },
  handler: async (ctx, { emailId }) => {
    // Get email details
    const email = await ctx.runQuery(internal.emails.getEmailById, { emailId });
    
    if (!email || email.status !== "sending") {
      return;
    }
    
    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.emails.markFailed, {
        emailId,
        error: "RESEND_API_KEY not configured",
      });
      return;
    }
    
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
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
      
      // Success!
      await ctx.runMutation(internal.emails.markSent, { emailId });
      
      // Schedule next email processing (rate limit: 1 per second)
      await ctx.scheduler.runAfter(PROCESS_INTERVAL_MS, internal.emails.processQueue, {});
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.emails.markFailed, {
        emailId,
        error: errorMessage,
      });
      
      // Still schedule next processing for retries
      await ctx.scheduler.runAfter(PROCESS_INTERVAL_MS * 5, internal.emails.processQueue, {});
    }
  },
});

// Internal query to get email by ID
export const getEmailById = internalQuery({
  args: { emailId: v.id("emailQueue") },
  handler: async (ctx, { emailId }) => {
    return await ctx.db.get(emailId);
  },
});

// Internal: Mark email as sent
export const markSent = internalMutation({
  args: { emailId: v.id("emailQueue") },
  handler: async (ctx, { emailId }) => {
    await ctx.db.patch(emailId, {
      status: "sent",
      sentAt: Date.now(),
    });
  },
});

// Internal: Mark email as failed
export const markFailed = internalMutation({
  args: { 
    emailId: v.id("emailQueue"),
    error: v.string(),
  },
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

// Admin: Get email queue status
export const getQueueStatus = query({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("emailQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    
    const sending = await ctx.db
      .query("emailQueue")
      .withIndex("by_status", (q) => q.eq("status", "sending"))
      .collect();
    
    const failed = await ctx.db
      .query("emailQueue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .filter((q) => q.lt(q.field("attempts"), MAX_ATTEMPTS))
      .collect();
    
    return {
      pending: pending.length,
      sending: sending.length,
      retriable: failed.length,
    };
  },
});

// Admin: Get failed emails with errors
export const getFailedEmails = query({
  args: {},
  handler: async (ctx) => {
    const failed = await ctx.db
      .query("emailQueue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();
    
    return failed.map(e => ({
      id: e._id,
      to: e.to,
      subject: e.subject,
      error: e.error,
      attempts: e.attempts,
      createdAt: e.createdAt,
    }));
  },
});

// Admin: Retry all failed emails
export const retryFailed = mutation({
  args: {},
  handler: async (ctx) => {
    const failed = await ctx.db
      .query("emailQueue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();
    
    let count = 0;
    for (const email of failed) {
      await ctx.db.patch(email._id, {
        status: "pending",
        error: undefined,
      });
      count++;
    }
    
    // Trigger processing
    if (count > 0) {
      await ctx.scheduler.runAfter(100, internal.emails.processQueue, {});
    }
    
    return { retriedCount: count };
  },
});
