import { Select } from "@/components/ui/Select";
import type { DictionaryResult } from "./types";

export function SignSearchPanel({
  searchQuery,
  onSearchQueryChange,
  showSearchResults,
  setShowSearchResults,
  dictionaryResults,
  hasExactMatch,
  selectedCategory,
  onSelectedCategoryChange,
  allCategoryOptions,
  addingSign,
  onCreateNewSign,
  onAddFromDictionary,
  addSuccess,
  addError,
}: {
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
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="relative">
        <input
          data-testid="child-sign-search"
          type="text"
          value={searchQuery}
          onChange={(event) => {
            onSearchQueryChange(event.target.value);
            setShowSearchResults(event.target.value.trim().length >= 2);
          }}
          onFocus={() => {
            if (searchQuery.trim().length >= 2) setShowSearchResults(true);
          }}
          placeholder="Search for a sign to add..."
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:ring-2 focus:ring-indigo-500"
        />

        {showSearchResults && searchQuery.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {dictionaryResults && dictionaryResults.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-xs uppercase text-gray-500">From Dictionary</div>
                {dictionaryResults.map((sign) => (
                  <div key={sign._id} className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50">
                    <div>
                      <span className="font-medium text-gray-800">{sign.name}</span>
                      {sign.category && <span className="ml-2 text-sm text-gray-500">({sign.category})</span>}
                    </div>
                    {sign.isKnown ? (
                      <span className="text-sm font-medium text-green-600">✓ Added</span>
                    ) : (
                      <button data-testid="child-add-existing-sign" type="button" onClick={() => void onAddFromDictionary(sign)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">+ Add</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!hasExactMatch && (
              <div className="border-t border-gray-100 p-3">
                <div className="mb-2 text-xs uppercase text-gray-500">Create New</div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedCategory}
                    onChange={onSelectedCategoryChange}
                    options={allCategoryOptions.filter(Boolean).map((category) => ({ value: category, label: category }))}
                    placeholder="Category"
                  />
                  <button
                    data-testid="child-create-sign"
                    type="button"
                    onClick={() => void onCreateNewSign()}
                    disabled={addingSign}
                    className="whitespace-nowrap rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {addingSign ? "Adding..." : `+ Create "${searchQuery.trim()}"`}
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 p-2">
              <button type="button" onClick={() => setShowSearchResults(false)} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {addSuccess && <div className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-600">{addSuccess}</div>}
      {addError && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-500">{addError}</div>}
    </div>
  );
}
