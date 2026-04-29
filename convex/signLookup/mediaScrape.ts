import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { MediaResult } from "./types";

type Candidate = { type: "gif" | "video" | "image"; url: string; score: number };

function normalizeMediaUrl(rawUrl: string, pageUrl: string) {
  const cleaned = rawUrl.trim().replace(/&amp;/g, "&");
  if (!cleaned || /^(data|javascript|mailto):/i.test(cleaned)) return null;

  try {
    const url = new URL(cleaned, pageUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function classifyMediaUrl(url: string): Candidate | null {
  const { pathname } = new URL(url);
  const path = pathname.toLowerCase();
  const filename = path.split("/").pop() ?? "";

  if (path.includes("/images-layout/") || path.includes("/bookstore/")) return null;

  if (path.endsWith(".gif") && (path.includes("/gifs/") || path.includes("/gifs-animated/"))) {
    const score = filename.includes("fast") || filename.includes("animated") ? 110 : 100;
    return { type: "gif", url, score };
  }

  if (path.endsWith(".mp4") || path.includes("/videos/")) {
    return { type: "video", url, score: 80 };
  }

  if (/\.(gif|jpe?g|png|webp)$/i.test(path) && (path.includes("/images-signs/") || path.includes("/signjpegs/"))) {
    return { type: "image", url, score: path.includes("/images-signs/") ? 60 : 45 };
  }

  return null;
}

function addCandidate(
  candidates: Map<string, Candidate>,
  rawUrl: string,
  pageUrl: string,
) {
  const absoluteUrl = normalizeMediaUrl(rawUrl, pageUrl);
  if (!absoluteUrl) return;

  const candidate = classifyMediaUrl(absoluteUrl);
  if (!candidate) return;

  const existing = candidates.get(candidate.url);
  if (!existing || candidate.score > existing.score) {
    candidates.set(candidate.url, candidate);
  }
}

export function extractMediaFromLifeprintHtml(html: string, lifeprintUrl: string): MediaResult {
  const candidates = new Map<string, Candidate>();
  const attrPattern = /\b(?:src|href|data-src|data-original|poster)\s*=\s*["']([^"']+)["']/gi;
  const pathPattern = /(?:https?:\/\/[^"'<>\s]+|(?:\.\.\/)+[^"'<>\s]+|\/asl101\/[^"'<>\s]+)\.(?:gif|mp4|jpe?g|png|webp)/gi;

  for (const match of html.matchAll(attrPattern)) {
    addCandidate(candidates, match[1], lifeprintUrl);
  }

  for (const match of html.matchAll(pathPattern)) {
    addCandidate(candidates, match[0], lifeprintUrl);
  }

  const ranked = [...candidates.values()].sort((a, b) => b.score - a.score);
  const primary = ranked[0];
  if (!primary) return { type: "none", url: null };

  return {
    type: primary.type,
    url: primary.url,
    variants: ranked.map(({ type, url }) => ({ type, url })),
  };
}

export const scrapeMedia = internalAction({
  args: { lifeprintUrl: v.string() },
  handler: async (_, { lifeprintUrl }): Promise<MediaResult> => {
    try {
      const response = await fetch(lifeprintUrl);
      if (!response.ok) return { type: "none", url: null };

      const html = await response.text();
      return extractMediaFromLifeprintHtml(html, lifeprintUrl);
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
