export type SignResult = {
  signId: string;
  name: string;
  description?: string;
  lifeprintUrl?: string;
  gifUrl?: string;
  imageUrl?: string;
  category?: string;
};

export type MediaResult = {
  type: "gif" | "video" | "image" | "none";
  url: string | null;
};

export type MediaInfo = {
  type: "gif" | "video" | "image" | "none";
  url: string | null;
};

export const PREDEFINED_CATEGORIES = [
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
] as const;

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Greetings: ["hello", "hi", "bye", "goodbye", "good morning", "good night", "please", "thank you", "sorry", "welcome"],
  Family: ["mom", "dad", "mother", "father", "sister", "brother", "baby", "grandma", "grandpa", "family", "aunt", "uncle", "cousin"],
  "Food & Drink": ["eat", "drink", "water", "milk", "food", "hungry", "apple", "banana", "cookie", "bread", "cheese", "more", "all done", "finished"],
  Animals: ["dog", "cat", "bird", "fish", "horse", "cow", "pig", "chicken", "duck", "rabbit", "bear", "lion", "elephant", "monkey"],
  Colors: ["red", "blue", "green", "yellow", "orange", "purple", "pink", "black", "white", "brown", "color"],
  Numbers: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "number"],
  Emotions: ["happy", "sad", "angry", "scared", "tired", "love", "like", "want", "need", "feel", "hurt", "sick"],
  Actions: ["play", "stop", "go", "help", "sleep", "wake", "walk", "run", "jump", "sit", "stand", "wait", "look", "listen"],
  Questions: ["what", "where", "who", "when", "why", "how", "which"],
  Time: ["today", "tomorrow", "yesterday", "now", "later", "morning", "afternoon", "night", "week", "month", "year"],
};
