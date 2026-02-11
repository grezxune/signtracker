import type { Id } from "../../../convex/_generated/dataModel";

export type ChildSummary = {
  _id: Id<"children">;
  name: string;
  signCount: number;
  role: "owner" | "shared";
};

export type DictionaryEntry = {
  _id: string;
  signId: string;
  name: string;
  description?: string;
  category?: string;
  lifeprintUrl?: string;
};

type BaseSuggestion = {
  _id: Id<"dictionarySuggestions">;
  term: string;
  category?: string;
  description?: string;
  submitterEmail?: string;
  createdAt: number;
};

export type PendingSuggestion = BaseSuggestion;
