import { CATEGORY_KEYWORDS } from "./types";

export function normalizeSignId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[\s-]+/g, "");
}

export function normalizeEmail(value?: string) {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function formatSignName(query: string) {
  return query
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getLifeprintUrl(word: string) {
  const firstLetter = word.charAt(0).toLowerCase();
  const slug = normalizeSignId(word);
  return `https://www.lifeprint.com/asl101/pages-signs/${firstLetter}/${slug}.htm`;
}

export function guessCategory(query: string): string {
  const lowerQuery = query.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lowerQuery.includes(kw) || kw.includes(lowerQuery))) {
      return category;
    }
  }
  return "General";
}

export function matchesSignSearch(name: string, signId: string, query: string) {
  const lowerQuery = query.toLowerCase();
  const normalizedQuery = normalizeForMatch(lowerQuery);
  return (
    normalizeForMatch(name).includes(normalizedQuery) ||
    normalizeForMatch(signId).includes(normalizedQuery) ||
    name.toLowerCase().includes(lowerQuery) ||
    signId.toLowerCase().includes(lowerQuery)
  );
}
