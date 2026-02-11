import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { logAuditEvent } from "../lib/audit";
import { getAuthUserByIdentity, requireSuperUser } from "./auth";
import { getLifeprintUrl, normalizeSignId } from "./helpers";
import { CORE_DICTIONARY_SEED } from "./seedData";

export const requestDictionarySuggestion = mutation({
  args: {
    term: v.string(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUserByIdentity(ctx);
    if (!user) throw new Error("Unauthorized");

    const normalizedSignId = normalizeSignId(args.term);
    const existingPending = await ctx.db
      .query("dictionarySuggestions")
      .withIndex("by_normalizedSignId_status", (q) =>
        q.eq("normalizedSignId", normalizedSignId).eq("status", "pending"),
      )
      .first();

    if (existingPending) {
      throw new Error("A pending suggestion already exists for this sign");
    }

    return await ctx.db.insert("dictionarySuggestions", {
      submittedBy: user._id,
      term: args.term.trim(),
      normalizedSignId,
      category: args.category,
      description: args.description,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const listDictionarySuggestions = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status = "pending", limit = 100 }) => {
    const user = await getAuthUserByIdentity(ctx);
    if (!user || user.role !== "super_user") {
      throw new Error("Access denied: super_user role required");
    }

    const suggestions = await ctx.db
      .query("dictionarySuggestions")
      .withIndex("by_status_createdAt", (q) => q.eq("status", status))
      .order("desc")
      .take(limit);

    return await Promise.all(
      suggestions.map(async (suggestion) => {
        const submitter = await ctx.db.get(suggestion.submittedBy);
        return {
          ...suggestion,
          submitterEmail: submitter?.email,
        };
      }),
    );
  },
});

export const reviewDictionarySuggestion = mutation({
  args: {
    suggestionId: v.id("dictionarySuggestions"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireSuperUser(ctx);
    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) throw new Error("Suggestion not found");
    if (suggestion.status !== "pending") throw new Error("Suggestion already reviewed");

    if (args.decision === "approved") {
      const existing = await ctx.db
        .query("savedSigns")
        .withIndex("by_sign_id", (q) => q.eq("signId", suggestion.normalizedSignId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: suggestion.term,
          category: suggestion.category,
          description: suggestion.description,
          lifeprintUrl: existing.lifeprintUrl || getLifeprintUrl(suggestion.term),
        });
      } else {
        await ctx.db.insert("savedSigns", {
          signId: suggestion.normalizedSignId,
          name: suggestion.term,
          category: suggestion.category,
          description: suggestion.description,
          lifeprintUrl: getLifeprintUrl(suggestion.term),
        });
      }
    }

    await ctx.db.patch(args.suggestionId, {
      status: args.decision,
      reviewedBy: reviewer._id,
      reviewNotes: args.reviewNotes,
      reviewedAt: Date.now(),
    });

    await logAuditEvent(ctx, {
      eventType: "dictionary.suggestion_reviewed",
      outcome: "success",
      actorUserId: reviewer._id,
      actorEmail: reviewer.email,
      targetType: "dictionary_suggestion",
      targetId: String(args.suggestionId),
      details: `Decision: ${args.decision}`,
    });
  },
});

export const seedCoreDictionary = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireSuperUser(ctx);
    let inserted = 0;
    let updated = 0;

    for (const entry of CORE_DICTIONARY_SEED) {
      const existing = await ctx.db
        .query("savedSigns")
        .withIndex("by_sign_id", (q) => q.eq("signId", entry.signId))
        .first();

      if (!existing) {
        await ctx.db.insert("savedSigns", {
          signId: entry.signId,
          name: entry.name,
          category: entry.category,
          description: entry.description,
          lifeprintUrl: getLifeprintUrl(entry.name),
        });
        inserted += 1;
      } else {
        await ctx.db.patch(existing._id, {
          name: existing.name || entry.name,
          category: existing.category || entry.category,
          description: existing.description || entry.description,
          lifeprintUrl: existing.lifeprintUrl || getLifeprintUrl(entry.name),
        });
        updated += 1;
      }
    }

    await logAuditEvent(ctx, {
      eventType: "dictionary.seed_core",
      outcome: "success",
      actorUserId: user._id,
      actorEmail: user.email,
      targetType: "dictionary",
      details: `inserted=${inserted}, updated=${updated}`,
    });

    return { inserted, updated, totalSeedEntries: CORE_DICTIONARY_SEED.length };
  },
});
