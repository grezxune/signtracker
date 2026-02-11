import type { Id } from "../../../convex/_generated/dataModel";

export type ConfidenceLevel = "learning" | "familiar" | "mastered";

export type KnownSign = {
  _id: Id<"knownSigns">;
  signId: string;
  signName: string;
  signCategory?: string;
  alias?: string;
  favorite?: boolean;
  confidence?: ConfidenceLevel;
  lifeprintUrl?: string;
  gifUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
};

export type ChildDetails = {
  _id: Id<"children">;
  name: string;
  role: "owner" | "shared";
  signs: KnownSign[];
  sharedWith: Array<{ id: Id<"users">; email: string; role: "owner" | "shared" }>;
};

export type PendingInvite = {
  id: Id<"invites">;
  email: string;
  createdAt: number;
};

export type ChildStats = {
  total: number;
  byConfidence: { learning: number; familiar: number; mastered: number };
  recentCount: number;
};

export type SignsByCategory = {
  favorites: KnownSign[];
  categories: Record<string, KnownSign[]>;
  allCategories: string[];
};

export type DictionaryResult = {
  _id: string;
  signId: string;
  name: string;
  category?: string;
  isKnown: boolean;
};
