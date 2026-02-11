import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users from NextAuth
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    provider: v.optional(v.string()), // google, github, resend
    role: v.optional(v.union(v.literal("user"), v.literal("super_user"))), // default: user
    createdAt: v.number(),
  }).index("by_email", ["email"]),
  
  // Children - can be shared between users
  children: defineTable({
    name: v.string(),
    birthDate: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdBy: v.id("users"),
  }).index("by_creator", ["createdBy"]),
  
  // Link table for sharing children between users
  childAccess: defineTable({
    childId: v.id("children"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("shared")),
  })
    .index("by_user", ["userId"])
    .index("by_child", ["childId"])
    .index("by_user_child", ["userId", "childId"]),
  
  // Known signs for each child
  knownSigns: defineTable({
    childId: v.id("children"),
    signId: v.string(), // External sign ID or slug
    signName: v.string(), // Original sign name (e.g., "father")
    signCategory: v.optional(v.string()),
    learnedAt: v.number(), // timestamp
    notes: v.optional(v.string()),
    confidence: v.optional(v.union(
      v.literal("learning"),
      v.literal("familiar"),
      v.literal("mastered")
    )),
    addedBy: v.id("users"),
    favorite: v.optional(v.boolean()),
    alias: v.optional(v.string()), // Custom name child uses (e.g., "dada")
  })
    .index("by_child", ["childId"])
    .index("by_child_sign", ["childId", "signId"])
    .index("by_sign_id", ["signId"]), // For cascade delete when dictionary entry removed
  
  // Cached/saved signs from ASL dictionary
  savedSigns: defineTable({
    signId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    lifeprintUrl: v.optional(v.string()), // Primary link to Lifeprint.com
    gifUrl: v.optional(v.string()), // Animated GIF showing the sign
    videoUrl: v.optional(v.string()), // MP4 video showing the sign
    imageUrl: v.optional(v.string()), // Static illustration
    mediaType: v.optional(v.union(v.literal("gif"), v.literal("video"), v.literal("image"), v.literal("none"))),
    category: v.optional(v.string()),
  }).index("by_sign_id", ["signId"]),
  
  // Pending invites for users who don't have accounts yet
  invites: defineTable({
    childId: v.id("children"),
    invitedEmail: v.string(),
    invitedBy: v.id("users"),
    role: v.union(v.literal("shared")),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_email", ["invitedEmail"])
    .index("by_child", ["childId"])
    .index("by_email_child", ["invitedEmail", "childId"]),
  
  // Email queue for rate-limited sending
  emailQueue: defineTable({
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed")
    ),
    attempts: v.number(),
    lastAttempt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
    // Reference to what triggered this email (for tracking)
    ref: v.optional(v.object({
      type: v.string(),
      id: v.string(),
    })),
  })
    .index("by_status", ["status"])
    .index("by_status_created", ["status", "createdAt"]),

  // Security and operational audit trail
  auditEvents: defineTable({
    eventType: v.string(),
    outcome: v.union(v.literal("success"), v.literal("denied"), v.literal("error")),
    actorUserId: v.optional(v.id("users")),
    actorEmail: v.optional(v.string()),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_eventType_createdAt", ["eventType", "createdAt"])
    .index("by_actorEmail_createdAt", ["actorEmail", "createdAt"])
    .index("by_outcome_createdAt", ["outcome", "createdAt"]),

  // Alert records for repeated denied attempts
  securityAlerts: defineTable({
    actorEmail: v.string(),
    eventType: v.string(),
    threshold: v.number(),
    countInWindow: v.number(),
    windowStart: v.number(),
    windowEnd: v.number(),
    status: v.union(v.literal("open"), v.literal("resolved")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    resolutionNotes: v.optional(v.string()),
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_actor_status", ["actorEmail", "status"]),

  // Governance queue for user-proposed dictionary additions/changes
  dictionarySuggestions: defineTable({
    submittedBy: v.id("users"),
    term: v.string(),
    normalizedSignId: v.string(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    reviewedBy: v.optional(v.id("users")),
    reviewNotes: v.optional(v.string()),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_submittedBy_createdAt", ["submittedBy", "createdAt"])
    .index("by_normalizedSignId_status", ["normalizedSignId", "status"]),
});
