import Link from "next/link";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ChildSummary, DictionaryEntry } from "./types";

export function ChildSelectionModal({
  selectedSign,
  childOptions,
  selectedChildren,
  addingToChildren,
  onToggleChild,
  onAdd,
  onClose,
}: {
  selectedSign: DictionaryEntry | null;
  childOptions: ChildSummary[];
  selectedChildren: Set<Id<"children">>;
  addingToChildren: boolean;
  onToggleChild: (childId: Id<"children">) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  if (!selectedSign) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="p-5">
          <h3 className="mb-1 text-lg font-semibold text-gray-800">Add &quot;{selectedSign.name}&quot;</h3>
          <p className="mb-4 text-sm text-gray-600">Select which children to add this sign to:</p>

          {childOptions.length === 0 ? (
            <div className="py-6 text-center">
              <p className="mb-4 text-gray-600">You haven&apos;t added any children yet.</p>
              <Link href="/" className="font-medium text-indigo-600">
                Add a child first →
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-4 space-y-2">
                {childOptions.map((child) => {
                  const isSelected = selectedChildren.has(child._id);
                  return (
                    <button
                      key={child._id}
                      type="button"
                      onClick={() => onToggleChild(child._id)}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                        isSelected ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${isSelected ? "border-indigo-600 bg-indigo-600" : "border-gray-300"}`}>
                        {isSelected && <span className="text-sm text-white">✓</span>}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">{child.name}</span>
                        <span className="ml-2 text-sm text-gray-500">({child.signCount} signs)</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onAdd}
                  disabled={selectedChildren.size === 0 || addingToChildren}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 font-medium text-white disabled:opacity-50"
                >
                  {addingToChildren
                    ? "Adding..."
                    : `Add to ${selectedChildren.size} child${selectedChildren.size !== 1 ? "ren" : ""}`}
                </button>
                <button type="button" onClick={onClose} className="rounded-xl bg-gray-200 px-6 py-3 font-medium text-gray-700">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
