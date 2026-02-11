import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import type { MediaInfo, MediaResult } from "./types";

function mapCachedMedia(sign: {
  mediaType?: "gif" | "video" | "image" | "none";
  gifUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
}) {
  if (sign.mediaType === "gif" && sign.gifUrl) return { type: "gif", url: sign.gifUrl } as MediaInfo;
  if (sign.mediaType === "video" && sign.videoUrl) return { type: "video", url: sign.videoUrl } as MediaInfo;
  if (sign.mediaType === "image" && sign.imageUrl) return { type: "image", url: sign.imageUrl } as MediaInfo;
  if (sign.mediaType === "none") return { type: "none", url: null } as MediaInfo;
  if (sign.gifUrl) return { type: "gif", url: sign.gifUrl } as MediaInfo;
  return null;
}

export const getSignByIdInternal = internalQuery({
  args: { signId: v.string() },
  handler: async (ctx, { signId }) => {
    return await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
  },
});

export const updateSignMedia = internalMutation({
  args: {
    signId: v.string(),
    mediaType: v.union(v.literal("gif"), v.literal("video"), v.literal("image"), v.literal("none")),
    gifUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sign = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", args.signId))
      .first();

    if (!sign) return;

    await ctx.db.patch(sign._id, {
      mediaType: args.mediaType,
      gifUrl: args.gifUrl,
      videoUrl: args.videoUrl,
      imageUrl: args.imageUrl,
    });
  },
});

export const fetchMediaForSignInternal = internalAction({
  args: { signId: v.string() },
  handler: async (ctx, { signId }): Promise<MediaInfo> => {
    const sign = await ctx.runQuery(internal.signLookup.getSignByIdInternal, { signId });
    if (!sign) return { type: "none", url: null };

    const cached = mapCachedMedia(sign);
    if (cached) return cached;
    if (!sign.lifeprintUrl) return { type: "none", url: null };

    const media = (await ctx.runAction(internal.signLookup.scrapeMedia, {
      lifeprintUrl: sign.lifeprintUrl,
    })) as MediaResult;

    await ctx.runMutation(internal.signLookup.updateSignMedia, {
      signId,
      mediaType: media.type,
      gifUrl: media.type === "gif" && media.url ? media.url : undefined,
      videoUrl: media.type === "video" && media.url ? media.url : undefined,
      imageUrl: media.type === "image" && media.url ? media.url : undefined,
    });

    return media;
  },
});

export const fetchMediaForSign = action({
  args: { signId: v.string() },
  handler: async (ctx, { signId }): Promise<MediaInfo> => {
    return await ctx.runAction(internal.signLookup.fetchMediaForSignInternal, { signId });
  },
});

export const fetchGifForSignInternal = internalAction({
  args: { signId: v.string() },
  handler: async (ctx, { signId }): Promise<string | null> => {
    const media = (await ctx.runAction(internal.signLookup.fetchMediaForSignInternal, {
      signId,
    })) as MediaInfo;
    return media.type === "gif" ? media.url : null;
  },
});

export const fetchGifForSign = action({
  args: { signId: v.string() },
  handler: async (ctx, { signId }): Promise<string | null> => {
    const media = (await ctx.runAction(internal.signLookup.fetchMediaForSignInternal, {
      signId,
    })) as MediaInfo;
    return media.type === "gif" ? media.url : null;
  },
});

export const updateSignGif = internalMutation({
  args: { signId: v.string(), gifUrl: v.string() },
  handler: async (ctx, { signId, gifUrl }) => {
    const sign = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
    if (!sign) return;
    await ctx.db.patch(sign._id, { gifUrl, mediaType: "gif" });
  },
});

export const fetchGifsForSigns = action({
  args: { signIds: v.array(v.string()) },
  handler: async (ctx, { signIds }) => {
    const results: Record<string, string | null> = {};
    const batchSize = 3;

    for (let index = 0; index < signIds.length; index += batchSize) {
      const batch = signIds.slice(index, index + batchSize);
      await Promise.all(
        batch.map(async (signId) => {
          const gifUrl = await ctx.runAction(internal.signLookup.fetchGifForSignInternal, { signId });
          results[signId] = gifUrl;
        }),
      );
    }

    return results;
  },
});
