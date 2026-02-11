import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { MediaResult } from "./types";

const MEDIA_BASE_URL = "https://www.lifeprint.com/asl101/";

function toAbsoluteUrl(path: string) {
  return path.replace("../../", MEDIA_BASE_URL);
}

export const scrapeMedia = internalAction({
  args: { lifeprintUrl: v.string() },
  handler: async (_, { lifeprintUrl }): Promise<MediaResult> => {
    try {
      const response = await fetch(lifeprintUrl);
      if (!response.ok) return { type: "none", url: null };

      const html = await response.text();
      const gifPatterns = [
        /src="\.\.\/\.\.\/gifs\/[^\"]+\.gif"/gi,
        /src="\.\.\/\.\.\/gifs-animated\/[^\"]+\.gif"/gi,
      ];

      for (const pattern of gifPatterns) {
        const match = html.match(pattern)?.[0];
        const pathMatch = match?.match(/src="([^\"]+)"/i)?.[1];
        if (pathMatch) return { type: "gif", url: toAbsoluteUrl(pathMatch) };
      }

      const videoMatch = html.match(/src="\.\.\/\.\.\/videos\/[^\"]+\.mp4"/i)?.[0];
      const videoPath = videoMatch?.match(/src="([^\"]+)"/i)?.[1];
      if (videoPath) return { type: "video", url: toAbsoluteUrl(videoPath) };

      const imageMatch = html.match(/src="\.\.\/\.\.\/images-signs\/[^\"]+\.gif"/i)?.[0];
      const imagePath = imageMatch?.match(/src="([^\"]+)"/i)?.[1];
      if (imagePath) return { type: "image", url: toAbsoluteUrl(imagePath) };

      return { type: "none", url: null };
    } catch (error) {
      console.error("Error scraping media:", error);
      return { type: "none", url: null };
    }
  },
});

export const scrapeGifUrl = internalAction({
  args: { lifeprintUrl: v.string() },
  handler: async (ctx, { lifeprintUrl }): Promise<string | null> => {
    const result = (await ctx.runAction(internal.signLookup.scrapeMedia, {
      lifeprintUrl,
    })) as MediaResult;
    return result.type === "gif" ? result.url : null;
  },
});
