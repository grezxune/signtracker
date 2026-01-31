import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
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
    signName: v.string(),
    signCategory: v.optional(v.string()),
    learnedAt: v.number(), // timestamp
    notes: v.optional(v.string()),
    confidence: v.optional(v.union(
      v.literal("learning"),
      v.literal("familiar"),
      v.literal("mastered")
    )),
    addedBy: v.id("users"),
  })
    .index("by_child", ["childId"])
    .index("by_child_sign", ["childId", "signId"]),
  
  // Cached/saved signs from ASL dictionary
  savedSigns: defineTable({
    signId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    category: v.optional(v.string()),
  }).index("by_sign_id", ["signId"]),
});
