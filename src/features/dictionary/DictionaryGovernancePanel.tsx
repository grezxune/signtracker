import type { PendingSuggestion } from "./types";

export function DictionaryGovernancePanel({
  suggestions,
  onSeed,
  onApprove,
  onReject,
  isSeeding,
  seedMessage,
}: {
  suggestions: PendingSuggestion[] | undefined;
  onSeed: () => Promise<void>;
  onApprove: (suggestionId: PendingSuggestion["_id"]) => Promise<void>;
  onReject: (suggestionId: PendingSuggestion["_id"]) => Promise<void>;
  isSeeding: boolean;
  seedMessage: string;
}) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Dictionary Governance</h3>
          <p className="text-sm text-gray-600">Seed core dictionary terms and review user suggestions.</p>
        </div>
        <button
          type="button"
          onClick={() => void onSeed()}
          disabled={isSeeding}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSeeding ? "Seeding..." : "Seed Core Dictionary"}
        </button>
      </div>

      {seedMessage && <div className="mb-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">{seedMessage}</div>}

      <h4 className="mb-2 font-semibold text-gray-800">Pending Suggestions</h4>
      {!suggestions ? (
        <p className="text-sm text-gray-500">Loading suggestions...</p>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-gray-500">No pending suggestions.</p>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion._id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-800">{suggestion.term}</p>
                  <p className="text-xs text-gray-500">
                    {suggestion.submitterEmail || "Unknown submitter"} • {new Date(suggestion.createdAt).toLocaleDateString()}
                  </p>
                  {suggestion.category && <p className="mt-1 text-sm text-gray-600">Category: {suggestion.category}</p>}
                  {suggestion.description && <p className="mt-1 text-sm text-gray-600">{suggestion.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void onApprove(suggestion._id)}
                    className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void onReject(suggestion._id)}
                    className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
