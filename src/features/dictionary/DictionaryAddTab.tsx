import { Select } from "@/components/ui/Select";

const COMMON_SIGNS = [
  "more",
  "all done",
  "milk",
  "eat",
  "drink",
  "help",
  "please",
  "thank you",
  "mom",
  "dad",
  "love",
  "play",
  "water",
  "sleep",
  "bath",
  "book",
  "ball",
  "dog",
  "cat",
  "yes",
  "no",
];

export function DictionaryAddTab({
  newSignName,
  onNewSignNameChange,
  newSignCategory,
  onNewSignCategoryChange,
  allCategoryOptions,
  addingSign,
  addError,
  addSuccess,
  onSubmit,
  canSuggest,
  onSuggest,
  isSuggesting,
  suggestionMessage,
}: {
  newSignName: string;
  onNewSignNameChange: (value: string) => void;
  newSignCategory: string;
  onNewSignCategoryChange: (value: string) => void;
  allCategoryOptions: string[];
  addingSign: boolean;
  addError: string;
  addSuccess: string;
  onSubmit: (event: React.FormEvent) => void;
  canSuggest: boolean;
  onSuggest: () => Promise<void>;
  isSuggesting: boolean;
  suggestionMessage: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold text-gray-800">Add a Sign to the Dictionary</h3>
        <p className="mb-4 text-sm text-gray-600">
          Add a new sign that everyone can use. You can add it to your children after.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            value={newSignName}
            onChange={(event) => onNewSignNameChange(event.target.value)}
            placeholder="Enter a word (e.g., 'milk', 'more')"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:ring-2 focus:ring-indigo-500"
          />
          <Select
            value={newSignCategory}
            onChange={onNewSignCategoryChange}
            options={allCategoryOptions.filter(Boolean).map((category) => ({ value: category, label: category }))}
            placeholder="Select category"
          />

          {addError && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-500">{addError}</div>}
          {addSuccess && <div className="rounded-xl bg-green-50 p-3 text-sm text-green-600">{addSuccess}</div>}

          <button
            type="submit"
            disabled={addingSign || !newSignName.trim()}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {addingSign ? "Adding..." : "+ Add to Dictionary"}
          </button>

          {canSuggest && (
            <button
              type="button"
              disabled={isSuggesting || !newSignName.trim()}
              onClick={() => void onSuggest()}
              className="w-full rounded-xl bg-gray-200 px-6 py-3 text-base font-medium text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
            >
              {isSuggesting ? "Submitting..." : "Submit Suggestion for Review"}
            </button>
          )}
          {suggestionMessage && (
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{suggestionMessage}</div>
          )}
        </form>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h4 className="mb-3 font-semibold text-gray-800">Common First Signs</h4>
        <div className="flex flex-wrap gap-2">
          {COMMON_SIGNS.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => onNewSignNameChange(word)}
              className="rounded-full bg-gray-100 px-4 py-2 text-base text-gray-700 transition hover:bg-gray-200"
            >
              {word}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
