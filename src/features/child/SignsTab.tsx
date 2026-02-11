import Link from "next/link";
import type { Id } from "../../../convex/_generated/dataModel";
import { CategoryAccordion } from "./CategoryAccordion";
import { SignCard } from "./SignCard";
import { SignSearchPanel } from "./SignSearchPanel";
import type { ConfidenceLevel, DictionaryResult, KnownSign, SignsByCategory } from "./types";

export function SignsTab({
  childName,
  totalSigns,
  signsByCategory,
  expandedCategories,
  onToggleCategory,
  searchProps,
  onUpdate,
  onRemove,
  onToggleFavorite,
  onUpdateAlias,
  onUpdateSignName,
  onFetchMedia,
}: {
  childName: string;
  totalSigns: number;
  signsByCategory: SignsByCategory | undefined;
  expandedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  searchProps: {
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    showSearchResults: boolean;
    setShowSearchResults: (value: boolean) => void;
    dictionaryResults: DictionaryResult[] | undefined;
    hasExactMatch: boolean;
    selectedCategory: string;
    onSelectedCategoryChange: (value: string) => void;
    allCategoryOptions: string[];
    addingSign: boolean;
    onCreateNewSign: () => Promise<void>;
    onAddFromDictionary: (sign: DictionaryResult) => Promise<void>;
    addSuccess: string;
    addError: string;
  };
  onUpdate: (args: { knownSignId: Id<"knownSigns">; confidence?: ConfidenceLevel }) => Promise<unknown>;
  onRemove: (args: { knownSignId: Id<"knownSigns"> }) => Promise<unknown>;
  onToggleFavorite: (args: { knownSignId: Id<"knownSigns"> }) => Promise<unknown>;
  onUpdateAlias: (args: { knownSignId: Id<"knownSigns">; alias: string | null }) => Promise<unknown>;
  onUpdateSignName: (args: { knownSignId: Id<"knownSigns">; signName: string }) => Promise<unknown>;
  onFetchMedia: (signId: string) => Promise<{ type: string; url: string | null }>;
}) {
  return (
    <div className="space-y-4">
      <SignSearchPanel {...searchProps} />

      {totalSigns === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-6xl">🤟</div>
          <h3 className="mb-2 text-xl font-semibold text-gray-800">No signs yet</h3>
          <p className="mb-6 text-gray-600">Search above to add signs for {childName}, or browse the dictionary!</p>
          <Link href="/dictionary" className="inline-block rounded-xl bg-indigo-600 px-6 py-3 text-base font-medium text-white transition hover:bg-indigo-700">📚 Browse Dictionary</Link>
        </div>
      ) : !signsByCategory ? (
        <div className="py-8 text-center text-gray-600">Loading signs...</div>
      ) : (
        <div className="space-y-3">
          {signsByCategory.favorites.length > 0 && (
            <CategoryAccordion title="⭐ Favorites" count={signsByCategory.favorites.length} isExpanded={expandedCategories.has("Favorites")} onToggle={() => onToggleCategory("Favorites")}>
              <div className="space-y-2">{signsByCategory.favorites.map((sign) => <SignCard key={sign._id} sign={sign as KnownSign} onUpdate={onUpdate} onRemove={onRemove} onToggleFavorite={onToggleFavorite} onUpdateAlias={onUpdateAlias} onUpdateSignName={onUpdateSignName} onFetchMedia={onFetchMedia} />)}</div>
            </CategoryAccordion>
          )}
          {signsByCategory.allCategories.map((category) => {
            const signs = signsByCategory.categories[category];
            if (!signs?.length) return null;
            return (
              <CategoryAccordion key={category} title={category} count={signs.length} isExpanded={expandedCategories.has(category)} onToggle={() => onToggleCategory(category)}>
                <div className="space-y-2">{signs.map((sign) => <SignCard key={sign._id} sign={sign as KnownSign} onUpdate={onUpdate} onRemove={onRemove} onToggleFavorite={onToggleFavorite} onUpdateAlias={onUpdateAlias} onUpdateSignName={onUpdateSignName} onFetchMedia={onFetchMedia} />)}</div>
              </CategoryAccordion>
            );
          })}
        </div>
      )}
    </div>
  );
}
