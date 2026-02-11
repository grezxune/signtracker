import { v } from "convex/values";
import {
  action,
  query,
  mutation,
  internalMutation,
  internalQuery,
  internalAction,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

type SignResult = {
  signId: string;
  name: string;
  description?: string;
  lifeprintUrl?: string;
  gifUrl?: string;
  imageUrl?: string;
  category?: string;
};

type ReadCtx = QueryCtx | MutationCtx;

async function getAuthUserByIdentity(ctx: ReadCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || typeof identity.email !== "string") return null;

  const email = identity.email.toLowerCase();
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
}

async function requireSuperUser(ctx: MutationCtx) {
  const user = await getAuthUserByIdentity(ctx);
  if (!user || user.role !== "super_user") {
    throw new Error("Access denied: super_user role required");
  }
  return user;
}

// Search for signs - returns cached results or fetches new ones
export const search = internalAction({
  args: { 
    query: v.string(),
  },
  handler: async (ctx, { query: searchQuery }): Promise<{ results: SignResult[]; source: string }> => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return { results: [], source: "none" };
    }
    
    // First check our cache
    const cached: SignResult[] = await ctx.runQuery(internal.signLookup.getCachedSigns, { 
      query: normalizedQuery 
    });
    
    if (cached.length > 0) {
      return { results: cached, source: "cache" };
    }
    
    // Create entry with Lifeprint as primary source
    const results = createLifeprintEntry(normalizedQuery);
    
    // Cache the results
    for (const sign of results) {
      await ctx.runMutation(internal.signLookup.cacheSign, { sign });
    }
    
    return { results, source: "lifeprint" };
  },
});

// Internal: Get cached signs matching query
export const getCachedSigns = internalQuery({
  args: { query: v.string() },
  handler: async (ctx, { query: searchQuery }): Promise<SignResult[]> => {
    // Normalize query - convert spaces to hyphens for signId lookup
    const normalizedSignId = searchQuery.toLowerCase().replace(/\s+/g, "-");
    
    // Search by exact match first (try both original and normalized)
    let exactMatch = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", searchQuery.toLowerCase()))
      .first();
    
    // If not found, try with normalized (hyphenated) version
    if (!exactMatch && normalizedSignId !== searchQuery.toLowerCase()) {
      exactMatch = await ctx.db
        .query("savedSigns")
        .withIndex("by_sign_id", (q) => q.eq("signId", normalizedSignId))
        .first();
    }
    
    if (exactMatch) {
      return [{
        signId: exactMatch.signId,
        name: exactMatch.name,
        description: exactMatch.description,
        lifeprintUrl: exactMatch.lifeprintUrl,
        gifUrl: exactMatch.gifUrl,
        imageUrl: exactMatch.imageUrl,
        category: exactMatch.category,
      }];
    }
    
    // Then search by name containing the query (normalize spaces/hyphens)
    const allSigns = await ctx.db.query("savedSigns").collect();
    const searchNormalized = searchQuery.toLowerCase().replace(/[\s-]+/g, "");
    const matches = allSigns.filter(sign => {
      const nameNormalized = sign.name.toLowerCase().replace(/[\s-]+/g, "");
      const signIdNormalized = sign.signId.toLowerCase().replace(/[\s-]+/g, "");
      return nameNormalized.includes(searchNormalized) ||
             signIdNormalized.includes(searchNormalized) ||
             sign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             sign.signId.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
    return matches.slice(0, 10).map(s => ({
      signId: s.signId,
      name: s.name,
      description: s.description,
      lifeprintUrl: s.lifeprintUrl,
      gifUrl: s.gifUrl,
      imageUrl: s.imageUrl,
      category: s.category,
    }));
  },
});

// Internal: Cache a sign
export const cacheSign = internalMutation({
  args: {
    sign: v.object({
      signId: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      lifeprintUrl: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      category: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { sign }) => {
    // Check if already cached
    const existing = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", sign.signId))
      .first();
    
    if (existing) {
      // Update if we have better data
      if (sign.lifeprintUrl && !existing.lifeprintUrl) {
        await ctx.db.patch(existing._id, { lifeprintUrl: sign.lifeprintUrl });
      }
      return existing._id;
    }
    
    return await ctx.db.insert("savedSigns", sign);
  },
});

// Create Lifeprint entry for a search term
function createLifeprintEntry(query: string): SignResult[] {
  const lifeprintUrl = getLifeprintUrl(query);
  const formattedName = formatSignName(query);
  
  // Determine category based on common sign categories
  const category = guessCategory(query);
  
  return [{
    signId: query.toLowerCase().replace(/\s+/g, "-"),
    name: formattedName,
    description: `Learn the ASL sign for "${formattedName}" on Lifeprint.com`,
    lifeprintUrl,
    category,
  }];
}

// Get Lifeprint URL for a word
function getLifeprintUrl(word: string): string {
  const firstLetter = word.charAt(0).toLowerCase();
  const slug = word.toLowerCase().replace(/\s+/g, "-");
  return `https://www.lifeprint.com/asl101/pages-signs/${firstLetter}/${slug}.htm`;
}

// Format sign name nicely
function formatSignName(query: string): string {
  return query
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Guess category based on common words
function guessCategory(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Common category keywords
  const categories: Record<string, string[]> = {
    "Greetings": ["hello", "hi", "bye", "goodbye", "good morning", "good night", "please", "thank you", "sorry", "welcome"],
    "Family": ["mom", "dad", "mother", "father", "sister", "brother", "baby", "grandma", "grandpa", "family", "aunt", "uncle", "cousin"],
    "Food & Drink": ["eat", "drink", "water", "milk", "food", "hungry", "apple", "banana", "cookie", "bread", "cheese", "more", "all done", "finished"],
    "Animals": ["dog", "cat", "bird", "fish", "horse", "cow", "pig", "chicken", "duck", "rabbit", "bear", "lion", "elephant", "monkey"],
    "Colors": ["red", "blue", "green", "yellow", "orange", "purple", "pink", "black", "white", "brown", "color"],
    "Numbers": ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "number"],
    "Emotions": ["happy", "sad", "angry", "scared", "tired", "love", "like", "want", "need", "feel", "hurt", "sick"],
    "Actions": ["play", "stop", "go", "help", "sleep", "wake", "walk", "run", "jump", "sit", "stand", "wait", "look", "listen"],
    "Questions": ["what", "where", "who", "when", "why", "how", "which"],
    "Time": ["today", "tomorrow", "yesterday", "now", "later", "morning", "afternoon", "night", "week", "month", "year"],
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => lowerQuery.includes(kw) || kw.includes(lowerQuery))) {
      return category;
    }
  }
  
  return "General";
}

// Quick add - search and add in one step
export const quickAdd = action({
  args: {
    childId: v.optional(v.id("children")),
    searchQuery: v.string(),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    dictionaryOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { childId, searchQuery, notes, category, dictionaryOnly }): Promise<SignResult> => {
    const userId = await ctx.runQuery(internal.signLookup.getCurrentUserId, {});
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Search for the sign (this also caches it to dictionary)
    const searchResult = await ctx.runAction(internal.signLookup.search, { 
      query: searchQuery 
    }) as { results: SignResult[]; source: string };
    
    if (searchResult.results.length === 0) {
      throw new Error(`No sign found for "${searchQuery}"`);
    }
    
    const sign: SignResult = searchResult.results[0];
    
    // Use provided category or the guessed one
    const finalCategory = category || sign.category;
    
    // If dictionaryOnly mode, just ensure the sign is in dictionary
    if (dictionaryOnly) {
      await ctx.runMutation(internal.signLookup.ensureDictionaryEntry, {
        signId: sign.signId,
        signName: sign.name,
        signCategory: finalCategory,
        lifeprintUrl: sign.lifeprintUrl,
        description: sign.description,
      });
      return { ...sign, category: finalCategory };
    }
    
    // If no childId provided for non-dictionary mode, error
    if (!childId) {
      throw new Error("childId required when not in dictionaryOnly mode");
    }
    
    // Add to known signs
    await ctx.runMutation(internal.signLookup.addKnownSign, {
      userId,
      childId,
      signId: sign.signId,
      signName: sign.name,
      signCategory: finalCategory,
      notes,
      lifeprintUrl: sign.lifeprintUrl,
      description: sign.description,
    });
    
    return { ...sign, category: finalCategory };
  },
});

export const getCurrentUserId = internalQuery({
  args: {},
  handler: async (ctx): Promise<Id<"users"> | null> => {
    const user = await getAuthUserByIdentity(ctx);
    return user?._id ?? null;
  },
});

// Internal mutation to ensure a sign exists in dictionary
export const ensureDictionaryEntry = internalMutation({
  args: {
    signId: v.string(),
    signName: v.string(),
    signCategory: v.optional(v.string()),
    lifeprintUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { signId, signName, signCategory, lifeprintUrl, description }) => {
    const normalizedSignId = signId.toLowerCase();
    
    const existing = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", normalizedSignId))
      .first();
    
    if (existing) {
      return existing._id;
    }
    
    return await ctx.db.insert("savedSigns", {
      signId: normalizedSignId,
      name: signName,
      description,
      lifeprintUrl,
      category: signCategory,
    });
  },
});

// Internal mutation to add known sign with extra data
export const addKnownSign = internalMutation({
  args: {
    userId: v.id("users"),
    childId: v.id("children"),
    signId: v.string(),
    signName: v.string(),
    signCategory: v.optional(v.string()),
    notes: v.optional(v.string()),
    lifeprintUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { userId, childId, signId: rawSignId, signName, signCategory, notes, lifeprintUrl, description }) => {
    // Normalize signId to lowercase for consistent matching
    const signId = rawSignId.toLowerCase();
    
    // Check access
    const access = await ctx.db
      .query("childAccess")
      .withIndex("by_user_child", (q) => q.eq("userId", userId).eq("childId", childId))
      .first();
    
    if (!access) throw new Error("Access denied");
    
    // Check if already known (also check with original casing for legacy data)
    const existingExact = await ctx.db
      .query("knownSigns")
      .withIndex("by_child_sign", (q) => q.eq("childId", childId).eq("signId", signId))
      .first();
    
    const existingRaw = rawSignId !== signId ? await ctx.db
      .query("knownSigns")
      .withIndex("by_child_sign", (q) => q.eq("childId", childId).eq("signId", rawSignId))
      .first() : null;
    
    if (existingExact || existingRaw) {
      throw new Error("Sign already in known list");
    }
    
    // Also ensure the sign is cached
    const cachedSign = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
    
    if (!cachedSign) {
      await ctx.db.insert("savedSigns", {
        signId,
        name: signName,
        description,
        lifeprintUrl,
        category: signCategory,
      });
    }
    
    // Add to known signs
    return await ctx.db.insert("knownSigns", {
      childId,
      signId,
      signName,
      signCategory,
      learnedAt: Date.now(),
      notes,
      confidence: "learning",
      addedBy: userId,
      favorite: false,
    });
  },
});

// Get sign details
export const getSignDetails = query({
  args: { signId: v.string() },
  handler: async (ctx, { signId }) => {
    return await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
  },
});

// Public search action for frontend
export const searchSigns = action({
  args: { query: v.string() },
  handler: async (ctx, { query: searchQuery }): Promise<{ results: SignResult[]; source: string }> => {
    return await ctx.runAction(internal.signLookup.search, { query: searchQuery }) as { results: SignResult[]; source: string };
  },
});

// Get all available categories (includes both predefined and any from existing signs)
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const predefined = [
      "Greetings",
      "Family",
      "Food & Drink",
      "Animals",
      "Colors",
      "Numbers",
      "Emotions",
      "Actions",
      "Questions",
      "Time",
      "General",
    ];
    
    // Get unique categories from saved signs
    const allSigns = await ctx.db.query("savedSigns").collect();
    const existingCategories = new Set(allSigns.map(s => s.category).filter(Boolean));
    
    // Merge and dedupe
    const allCategories = new Set([...predefined, ...existingCategories]);
    return Array.from(allCategories).sort();
  },
});

// Browse platform dictionary - all signs available on the platform
export const browseDictionary = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    childId: v.optional(v.id("children")),
  },
  handler: async (ctx, { category, search, limit = 50, childId }) => {
    let signs = await ctx.db.query("savedSigns").collect();
    
    // Filter by category
    if (category && category !== "all") {
      signs = signs.filter(s => s.category === category);
    }
    
    // Filter by search (normalize spaces/hyphens for matching)
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      const searchNormalized = searchLower.replace(/[\s-]+/g, ""); // Remove spaces and hyphens
      signs = signs.filter(s => {
        const nameNormalized = s.name.toLowerCase().replace(/[\s-]+/g, "");
        const signIdNormalized = s.signId.toLowerCase().replace(/[\s-]+/g, "");
        return nameNormalized.includes(searchNormalized) ||
               signIdNormalized.includes(searchNormalized) ||
               s.name.toLowerCase().includes(searchLower) ||
               s.signId.toLowerCase().includes(searchLower);
      });
    }
    
    // Sort alphabetically
    signs.sort((a, b) => a.name.localeCompare(b.name));
    
    const slicedSigns = signs.slice(0, limit);
    
    // If childId provided, check which signs are already known
    if (childId) {
      const user = await getAuthUserByIdentity(ctx);
      if (!user) {
        throw new Error("Unauthorized");
      }

      const access = await ctx.db
        .query("childAccess")
        .withIndex("by_user_child", (q) => q.eq("userId", user._id).eq("childId", childId))
        .first();

      if (!access) {
        throw new Error("Access denied");
      }

      const knownSigns = await ctx.db
        .query("knownSigns")
        .withIndex("by_child", (q) => q.eq("childId", childId))
        .collect();
      
      // Create a set of known signIds (normalize to lowercase for comparison)
      const knownSignIds = new Set(knownSigns.map(ks => ks.signId.toLowerCase()));
      
      return slicedSigns.map(s => ({
        ...s,
        isKnown: knownSignIds.has(s.signId.toLowerCase()),
      }));
    }
    
    return slicedSigns.map(s => ({ ...s, isKnown: false }));
  },
});

// Browse platform dictionary - global version (no child-specific isKnown check)
export const browseDictionaryGlobal = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { category, search, limit = 50 }) => {
    let signs = await ctx.db.query("savedSigns").collect();
    
    // Filter by category
    if (category && category !== "all") {
      signs = signs.filter(s => s.category === category);
    }
    
    // Filter by search (normalize spaces/hyphens for matching)
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      const searchNormalized = searchLower.replace(/[\s-]+/g, ""); // Remove spaces and hyphens
      signs = signs.filter(s => {
        const nameNormalized = s.name.toLowerCase().replace(/[\s-]+/g, "");
        const signIdNormalized = s.signId.toLowerCase().replace(/[\s-]+/g, "");
        return nameNormalized.includes(searchNormalized) ||
               signIdNormalized.includes(searchNormalized) ||
               s.name.toLowerCase().includes(searchLower) ||
               s.signId.toLowerCase().includes(searchLower);
      });
    }
    
    // Sort alphabetically
    signs.sort((a, b) => a.name.localeCompare(b.name));
    
    return signs.slice(0, limit);
  },
});

// Get dictionary stats
export const getDictionaryStats = query({
  args: {},
  handler: async (ctx) => {
    const signs = await ctx.db.query("savedSigns").collect();
    
    // Count by category
    const byCategory: Record<string, number> = {};
    for (const sign of signs) {
      const cat = sign.category || "General";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
    
    return {
      total: signs.length,
      byCategory,
    };
  },
});

// Check if user is super_user
export const isSuperUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUserByIdentity(ctx);
    return user?.role === "super_user";
  },
});

// Super user: Edit dictionary entry
export const editDictionaryEntry = mutation({
  args: {
    signId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    lifeprintUrl: v.optional(v.string()),
  },
  handler: async (ctx, { signId, name, description, category, lifeprintUrl }) => {
    await requireSuperUser(ctx);

    // Find the dictionary entry
    const entry = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
    
    if (!entry) {
      throw new Error("Dictionary entry not found");
    }
    
    // Build update object with only provided fields
    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (lifeprintUrl !== undefined) updates.lifeprintUrl = lifeprintUrl;
    
    await ctx.db.patch(entry._id, updates);
    
    return { success: true, signId };
  },
});

// Super user: Delete dictionary entry (cascades to all knownSigns)
export const deleteDictionaryEntry = mutation({
  args: {
    signId: v.string(),
  },
  handler: async (ctx, { signId }) => {
    await requireSuperUser(ctx);

    // Find the dictionary entry
    const entry = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
    
    if (!entry) {
      throw new Error("Dictionary entry not found");
    }
    
    // Cascade delete: remove all knownSigns that reference this signId
    const knownSignsToDelete = await ctx.db
      .query("knownSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .collect();
    
    // Also check lowercase version for legacy data
    const knownSignsLower = signId.toLowerCase() !== signId 
      ? await ctx.db
          .query("knownSigns")
          .withIndex("by_sign_id", (q) => q.eq("signId", signId.toLowerCase()))
          .collect()
      : [];
    
    const allKnownSigns = [...knownSignsToDelete, ...knownSignsLower];
    const deletedFromProfiles = allKnownSigns.length;
    
    // Delete all knownSigns
    for (const ks of allKnownSigns) {
      await ctx.db.delete(ks._id);
    }
    
    // Delete the dictionary entry
    await ctx.db.delete(entry._id);
    
    return { 
      success: true, 
      signId, 
      deletedFromProfiles,
    };
  },
});

// Super user: Set user role (only super_user can promote others)
export const setUserRole = mutation({
  args: {
    targetEmail: v.string(), // user to update
    role: v.union(v.literal("user"), v.literal("super_user")),
  },
  handler: async (ctx, { targetEmail, role }) => {
    await requireSuperUser(ctx);

    // Find target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", targetEmail.toLowerCase()))
      .first();
    
    if (!targetUser) {
      throw new Error("Target user not found");
    }
    
    await ctx.db.patch(targetUser._id, { role });
    
    return { success: true, targetEmail, role };
  },
});

// Media result from scraping
type MediaResult = {
  type: "gif" | "video" | "image" | "none";
  url: string | null;
};

// Scrape media (GIF, video, or image) from Lifeprint page
export const scrapeMedia = internalAction({
  args: { lifeprintUrl: v.string() },
  handler: async (_, { lifeprintUrl }): Promise<MediaResult> => {
    try {
      const response = await fetch(lifeprintUrl);
      if (!response.ok) return { type: "none", url: null };
      
      const html = await response.text();
      
      // Priority 1: Animated GIFs from gifs/ or gifs-animated/ folders
      const gifPatterns = [
        /src="\.\.\/\.\.\/gifs\/[^"]+\.gif"/gi,
        /src="\.\.\/\.\.\/gifs-animated\/[^"]+\.gif"/gi,
      ];
      
      for (const pattern of gifPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          const pathMatch = matches[0].match(/src="([^"]+)"/i);
          if (pathMatch) {
            const absoluteUrl = pathMatch[1].replace("../../", "https://www.lifeprint.com/asl101/");
            return { type: "gif", url: absoluteUrl };
          }
        }
      }
      
      // Priority 2: MP4 videos
      const videoMatch = html.match(/src="\.\.\/\.\.\/videos\/[^"]+\.mp4"/i);
      if (videoMatch) {
        const pathMatch = videoMatch[0].match(/src="([^"]+)"/i);
        if (pathMatch) {
          const absoluteUrl = pathMatch[1].replace("../../", "https://www.lifeprint.com/asl101/");
          return { type: "video", url: absoluteUrl };
        }
      }
      
      // Priority 3: Static images from images-signs/ (as fallback)
      const imageMatch = html.match(/src="\.\.\/\.\.\/images-signs\/[^"]+\.gif"/i);
      if (imageMatch) {
        const pathMatch = imageMatch[0].match(/src="([^"]+)"/i);
        if (pathMatch) {
          const absoluteUrl = pathMatch[1].replace("../../", "https://www.lifeprint.com/asl101/");
          return { type: "image", url: absoluteUrl };
        }
      }
      
      return { type: "none", url: null };
    } catch (error) {
      console.error("Error scraping media:", error);
      return { type: "none", url: null };
    }
  },
});

// Legacy: Scrape GIF URL only (for backwards compat)
export const scrapeGifUrl = internalAction({
  args: { lifeprintUrl: v.string() },
  handler: async (ctx, { lifeprintUrl }): Promise<string | null> => {
    const result = await ctx.runAction(internal.signLookup.scrapeMedia, { lifeprintUrl });
    return result.type === "gif" ? result.url : null;
  },
});

// Media info returned to frontend
type MediaInfo = {
  type: "gif" | "video" | "image" | "none";
  url: string | null;
};

// Fetch and cache media for a sign
export const fetchMediaForSign = action({
  args: { signId: v.string() },
  handler: async (ctx, { signId }): Promise<MediaInfo> => {
    // Get the sign from dictionary
    const sign = await ctx.runQuery(internal.signLookup.getSignByIdInternal, { signId });
    
    if (!sign) return { type: "none", url: null };
    
    // If already has media cached, return it
    if (sign.mediaType) {
      if (sign.mediaType === "gif" && sign.gifUrl) return { type: "gif", url: sign.gifUrl };
      if (sign.mediaType === "video" && sign.videoUrl) return { type: "video", url: sign.videoUrl };
      if (sign.mediaType === "image" && sign.imageUrl) return { type: "image", url: sign.imageUrl };
      if (sign.mediaType === "none") return { type: "none", url: null };
    }
    
    // Legacy: check gifUrl without mediaType
    if (sign.gifUrl) return { type: "gif", url: sign.gifUrl };
    
    // If no lifeprint URL, can't scrape
    if (!sign.lifeprintUrl) return { type: "none", url: null };
    
    // Scrape the media
    const media = await ctx.runAction(internal.signLookup.scrapeMedia, { 
      lifeprintUrl: sign.lifeprintUrl 
    }) as MediaResult;
    
    // Cache the result
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

// Legacy: Fetch GIF only (for backwards compat)
export const fetchGifForSign = action({
  args: { signId: v.string() },
  handler: async (ctx, { signId }): Promise<string | null> => {
    const media = await ctx.runAction(internal.signLookup.fetchMediaForSignInternal, { signId }) as MediaInfo;
    return media.type === "gif" ? media.url : null;
  },
});

// Internal query to get sign by ID
export const getSignByIdInternal = internalQuery({
  args: { signId: v.string() },
  handler: async (ctx, { signId }) => {
    return await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
  },
});

// Internal mutation to update sign media
export const updateSignMedia = internalMutation({
  args: { 
    signId: v.string(),
    mediaType: v.union(v.literal("gif"), v.literal("video"), v.literal("image"), v.literal("none")),
    gifUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { signId, mediaType, gifUrl, videoUrl, imageUrl }) => {
    const sign = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
    
    if (sign) {
      const updates: {
        mediaType: "gif" | "video" | "image" | "none";
        gifUrl?: string;
        videoUrl?: string;
        imageUrl?: string;
      } = { mediaType };
      if (gifUrl) updates.gifUrl = gifUrl;
      if (videoUrl) updates.videoUrl = videoUrl;
      if (imageUrl) updates.imageUrl = imageUrl;
      await ctx.db.patch(sign._id, updates);
    }
  },
});

// Legacy: update GIF only
export const updateSignGif = internalMutation({
  args: { 
    signId: v.string(),
    gifUrl: v.string(),
  },
  handler: async (ctx, { signId, gifUrl }) => {
    const sign = await ctx.db
      .query("savedSigns")
      .withIndex("by_sign_id", (q) => q.eq("signId", signId))
      .first();
    
    if (sign) {
      await ctx.db.patch(sign._id, { gifUrl, mediaType: "gif" as const });
    }
  },
});

// Batch fetch GIFs for multiple signs (for page load optimization)
export const fetchGifsForSigns = action({
  args: { signIds: v.array(v.string()) },
  handler: async (ctx, { signIds }): Promise<Record<string, string | null>> => {
    const results: Record<string, string | null> = {};
    
    // Process in parallel but limit concurrency
    const batchSize = 3;
    for (let i = 0; i < signIds.length; i += batchSize) {
      const batch = signIds.slice(i, i + batchSize);
      const promises = batch.map(async (signId) => {
        const gifUrl = await ctx.runAction(internal.signLookup.fetchGifForSignInternal, { signId });
        results[signId] = gifUrl;
      });
      await Promise.all(promises);
    }
    
    return results;
  },
});

// Internal version for batch processing
export const fetchMediaForSignInternal = internalAction({
  args: { signId: v.string() },
  handler: async (ctx, { signId }): Promise<MediaInfo> => {
    const sign = await ctx.runQuery(internal.signLookup.getSignByIdInternal, { signId });
    
    if (!sign) return { type: "none", url: null };
    
    // Check cached media
    if (sign.mediaType) {
      if (sign.mediaType === "gif" && sign.gifUrl) return { type: "gif", url: sign.gifUrl };
      if (sign.mediaType === "video" && sign.videoUrl) return { type: "video", url: sign.videoUrl };
      if (sign.mediaType === "image" && sign.imageUrl) return { type: "image", url: sign.imageUrl };
      if (sign.mediaType === "none") return { type: "none", url: null };
    }
    
    if (sign.gifUrl) return { type: "gif", url: sign.gifUrl };
    if (!sign.lifeprintUrl) return { type: "none", url: null };
    
    const media = await ctx.runAction(internal.signLookup.scrapeMedia, { 
      lifeprintUrl: sign.lifeprintUrl 
    }) as MediaResult;
    
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

// Legacy: for backwards compat
export const fetchGifForSignInternal = internalAction({
  args: { signId: v.string() },
  handler: async (ctx, { signId }): Promise<string | null> => {
    const media = await ctx.runAction(internal.signLookup.fetchMediaForSignInternal, { signId }) as MediaInfo;
    return media.type === "gif" ? media.url : null;
  },
});
