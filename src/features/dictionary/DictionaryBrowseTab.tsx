import { Select } from "@/components/ui/Select";
import type { DictionaryEntry } from "./types";

type EditFormState = {
  name: string;
  description: string;
  category: string;
};

export function DictionaryBrowseTab({
  searchQuery,
  onSearchQueryChange,
  selectedCategory,
  onSelectedCategoryChange,
  allCategoryOptions,
  dictionary,
  childrenCount,
  isSuperUser,
  editingSignId,
  editForm,
  onEditFormChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onSelectSign,
  onSwitchToAdd,
}: {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedCategory: string;
  onSelectedCategoryChange: (value: string) => void;
  allCategoryOptions: string[];
  dictionary: DictionaryEntry[] | undefined;
  childrenCount: number;
  isSuperUser: boolean;
  editingSignId: string | null;
  editForm: EditFormState;
  onEditFormChange: (value: EditFormState) => void;
  onStartEdit: (entry: DictionaryEntry) => void;
  onCancelEdit: () => void;
  onSaveEdit: (entry: DictionaryEntry) => Promise<void>;
  onDelete: (entry: DictionaryEntry) => void;
  onSelectSign: (entry: DictionaryEntry) => void;
  onSwitchToAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search signs..."
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 focus:ring-2 focus:ring-indigo-500"
          />
          <Select
            value={selectedCategory}
            onChange={onSelectedCategoryChange}
            options={[
              { value: "all", label: "All Categories" },
              ...allCategoryOptions.filter(Boolean).map((category) => ({ value: category, label: category })),
            ]}
            placeholder="All Categories"
          />
        </div>
      </div>

      {dictionary && dictionary.length > 0 ? (
        <div className="space-y-3">
          {dictionary.map((entry) => (
            <div key={entry._id} className="rounded-xl bg-white p-4 shadow-sm">
              {editingSignId === entry.signId ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(event) => onEditFormChange({ ...editForm, name: event.target.value })}
                    placeholder="Sign name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(event) => onEditFormChange({ ...editForm, description: event.target.value })}
                    placeholder="Description"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(event) => onEditFormChange({ ...editForm, category: event.target.value })}
                    placeholder="Category"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSaveEdit(entry)}
                      className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="rounded-lg bg-gray-300 px-4 py-2 font-medium text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-lg font-semibold text-gray-800">{entry.name}</h4>
                    {entry.description && <p className="mt-1 text-sm text-gray-600">{entry.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {entry.category && <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">{entry.category}</span>}
                      {entry.lifeprintUrl && (
                        <a href={entry.lifeprintUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600">
                          Learn Sign →
                        </a>
                      )}
                    </div>
                    {isSuperUser && (
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => onStartEdit(entry)} className="text-sm font-medium text-blue-600">
                          ✏️ Edit
                        </button>
                        <button type="button" onClick={() => onDelete(entry)} className="text-sm font-medium text-red-600">
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                  {childrenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectSign(entry)}
                      className="whitespace-nowrap rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700"
                    >
                      + Add to Child
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : dictionary && dictionary.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="mb-4 text-lg text-gray-600">
            {searchQuery ? `No signs found for "${searchQuery}"` : "No signs in the dictionary yet."}
          </p>
          <button type="button" onClick={onSwitchToAdd} className="text-lg font-medium text-indigo-600">
            Add &quot;{searchQuery || "a new sign"}&quot; to the dictionary →
          </button>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-600">Loading dictionary...</div>
      )}
    </div>
  );
}
